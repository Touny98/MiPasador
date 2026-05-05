import { MetaCloudProvider, ListSection } from '../messaging/meta-cloud';
import { searchProducts } from '@/lib/search/products';
import { normalizeQuery } from '@/lib/search/intent-parser';
import { supabaseAdmin } from '@/lib/utils/supabase';
import { createReservation } from '@/lib/services/reservationService';
import { MSG, truncate, parseReserveButtonId, isGreeting, isMenuRequest } from './messages';

function generateReservationCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

const metaProvider = new MetaCloudProvider(
  process.env.META_ACCESS_TOKEN!,
  process.env.META_PHONE_NUMBER_ID!
);

async function sendWelcome(from: string, merchantId: string): Promise<void> {
  let merchantName = 'este negocio';
  if (merchantId) {
    const { data } = await supabaseAdmin
      .from('merchants')
      .select('name')
      .eq('id', merchantId)
      .single();
    if (data?.name) merchantName = data.name;
  }
  await metaProvider.sendMessage(from, MSG.WELCOME(merchantName)).catch(() => {});
}

async function sendMenu(from: string): Promise<void> {
  const sections: ListSection[] = [
    {
      title: 'Opciones',
      rows: [
        { id: 'menu_search', title: 'Buscar productos', description: 'Escribí lo que querés encontrar' },
        { id: 'menu_reserve', title: 'Hacer una reserva', description: 'Escribí "reservar <producto>"' },
        { id: 'menu_help', title: 'Ayuda', description: 'Ver instrucciones de uso' },
      ],
    },
  ];
  try {
    await metaProvider.sendList(from, MSG.MENU_BODY, MSG.MENU_BUTTON, sections, MSG.MENU_HEADER);
  } catch {
    const text = `${MSG.MENU_HEADER}\n\n${MSG.MENU_BODY}\n\n1. Buscar productos\n2. Hacer una reserva\n3. Ayuda`;
    await metaProvider.sendMessage(from, text).catch(() => {});
  }
}

async function handleSearch(
  from: string,
  rawQuery: string,
  merchantId: string,
  conversationId: string
): Promise<void> {
  try {
    const products = await searchProducts(rawQuery, merchantId);

    const { error: queryErr } = await supabaseAdmin.from('queries').insert({
      search_term: rawQuery,
      normalized_search_term: normalizeQuery(rawQuery),
      results_count: products.length,
      resolved_bool: products.length > 0,
      conversation_id: conversationId || null,
    });
    if (queryErr) console.error('Failed to save query analytics:', queryErr);

    if (products.length === 0) {
      await metaProvider.sendMessage(from, MSG.NO_RESULTS).catch(() => {});
      return;
    }

    const top = products.slice(0, 3);

    try {
      if (top.length === 1) {
        const p = top[0];
        await metaProvider.sendInteractiveButtons(
          from,
          `${p.name} — $${p.price}${p.description ? '\n' + p.description : ''}`,
          [{ id: `reserve_${p.id}`, title: MSG.RESERVE_BUTTON_TITLE }],
          MSG.SEARCH_HEADER(1)
        );
      } else {
        const sections: ListSection[] = [
          {
            rows: top.map(p => ({
              id: `reserve_${p.id}`,
              title: truncate(p.name, 24),
              description: truncate(`$${p.price}${p.description ? ' — ' + p.description : ''}`, 72),
            })),
          },
        ];
        await metaProvider.sendList(
          from,
          MSG.SEARCH_BODY,
          MSG.SEARCH_BUTTON,
          sections,
          MSG.SEARCH_HEADER(top.length)
        );
      }
    } catch {
      // Graceful fallback to plain text if interactive API fails
      const lines = top.map((p, i) => `${i + 1}. ${p.name} — $${p.price}`).join('\n');
      await metaProvider.sendMessage(from, `${MSG.SEARCH_HEADER(top.length)}\n\n${lines}`).catch(() => {});
    }
  } catch (error) {
    console.error('Error in handleSearch:', error);
    await metaProvider.sendMessage(from, MSG.GENERIC_ERROR).catch(() => {});
  }
}

async function handleButtonReserve(
  from: string,
  productId: string,
  merchantId: string,
  conversationId: string
): Promise<void> {
  if (!conversationId) {
    await metaProvider.sendMessage(from, MSG.NO_CONVERSATION).catch(() => {});
    return;
  }
  try {
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('id, name, price, description')
      .eq('id', productId)
      .single();

    if (error || !product) {
      await metaProvider.sendMessage(from, MSG.NO_PRODUCT_FOR_RESERVE).catch(() => {});
      return;
    }

    const reservationCode = generateReservationCode();
    await createReservation({
      conversationId,
      productId: product.id,
      quantity: 1,
      status: 'pending',
      notes: reservationCode,
    });
    await metaProvider.sendMessage(from, MSG.RESERVE_CONFIRM(product.name, reservationCode)).catch(() => {});
    console.log(`New reservation for merchant ${merchantId}: Code ${reservationCode}, Product ${product.name}, Conversation ${conversationId}`);
  } catch (error) {
    console.error('Error in handleButtonReserve:', error);
    await metaProvider.sendMessage(from, MSG.RESERVE_ERROR).catch(() => {});
  }
}

export async function handleInteractiveMessage(
  from: string,
  replyId: string,
  merchantId: string,
  conversationId: string
): Promise<void> {
  const productId = parseReserveButtonId(replyId);
  if (productId !== null) {
    await handleButtonReserve(from, productId, merchantId, conversationId);
    return;
  }
  switch (replyId) {
    case 'menu_search':
      await metaProvider.sendMessage(from, 'Escribí el nombre del producto que buscás 🔍').catch(() => {});
      break;
    case 'menu_reserve':
      await metaProvider.sendMessage(from, 'Escribí "reservar" seguido del producto. Ej: reservar freidora').catch(() => {});
      break;
    case 'menu_help':
      await metaProvider.sendMessage(from, 'Para más ayuda, contactá directamente al negocio.').catch(() => {});
      break;
    default:
      await metaProvider.sendMessage(from, MSG.GENERIC_ERROR).catch(() => {});
  }
}

export async function handleIncomingMessage(
  from: string,
  message: string,
  merchantId: string = '',
  conversationId: string = ''
): Promise<void> {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (isGreeting(lower)) {
    await sendWelcome(from, merchantId);
    return;
  }

  if (isMenuRequest(lower)) {
    await sendMenu(from);
    return;
  }

  if (lower.includes('reservar')) {
    const productQuery = lower.replace('reservar', '').trim();

    if (!productQuery) {
      await metaProvider.sendMessage(from, MSG.RESERVE_MISSING_PRODUCT).catch(() => {});
      return;
    }

    if (!conversationId) {
      await metaProvider.sendMessage(from, MSG.NO_CONVERSATION).catch(() => {});
      return;
    }

    try {
      const products = await searchProducts(productQuery, merchantId);
      const topProduct = products[0];

      if (!topProduct) {
        await metaProvider.sendMessage(from, MSG.NO_PRODUCT_FOR_RESERVE).catch(() => {});
        return;
      }

      const reservationCode = generateReservationCode();
      await createReservation({
        conversationId,
        productId: topProduct.id,
        quantity: 1,
        status: 'pending',
        notes: reservationCode,
      });
      await metaProvider.sendMessage(from, MSG.RESERVE_CONFIRM(topProduct.name, reservationCode)).catch(() => {});
      console.log(`New reservation for merchant ${merchantId}: Code ${reservationCode}, Product ${topProduct.name}, Conversation ${conversationId}`);
      return;
    } catch (error) {
      console.error('Error processing reservation:', error);
      await metaProvider.sendMessage(from, MSG.RESERVE_ERROR).catch(() => {});
      return;
    }
  }

  await handleSearch(from, trimmed, merchantId, conversationId);
}
