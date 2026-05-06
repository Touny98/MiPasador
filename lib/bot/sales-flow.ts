import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { MetaCloudProvider } from '@/lib/messaging/meta-cloud';
import { searchProducts } from '@/lib/search/products';
import { createReservation } from '@/lib/services/reservationService';
import { MSG, truncate, isConfirmation, isNegation, isDoubtCheaper, isDoubtBetter, parseReserveButtonId } from '@/lib/bot/messages';

export interface SalesFlowState {
  step: 'eligiendo_categoria' | 'opciones' | 'decision';
  lastQuery: string;
  shownProductIds: string[];
  topProductId: string;
  topProductName: string;
  topProductPrice: number;
  followUpScheduled: boolean;
  selectedCategory?: string;
}

export function generateReservationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function showProductOptions(from: string, products: any[], metaProvider: MetaCloudProvider) {
  if (products.length === 0) return;

  const p = products[0];

  if (products.length === 1) {
    await metaProvider.sendInteractiveButtons(
      from,
      `${p.name} — $${p.price}${p.description ? '\n' + truncate(p.description, 60) : ''}`,
      [
        { id: `sales_reserve_${p.id}`, title: MSG.BTN_RESERVE },
        { id: 'sales_cheaper', title: MSG.BTN_CHEAPER },
        { id: 'sales_more', title: MSG.BTN_MORE },
      ],
      MSG.SEARCH_HEADER(1),
      p.total_reservations > 0 ? `🔥 ${p.total_reservations} personas lo reservaron` : undefined
    );
  } else {
    await metaProvider.sendList(
      from,
      MSG.SEARCH_BODY,
      MSG.SEARCH_BUTTON,
      [
        {
          title: '✅ Recomendado',
          rows: [
            { id: `sales_reserve_${p.id}`, title: truncate('🔥 ' + p.name, 24), description: `$${p.price} · más elegido` },
          ],
        },
        {
          title: 'Otras opciones',
          rows: products.slice(1).map(prod => ({
            id: `sales_reserve_${prod.id}`,
            title: truncate(prod.name, 24),
            description: `$${prod.price}`,
          })),
        },
      ],
      MSG.SEARCH_HEADER(products.length)
    );

    await metaProvider.sendInteractiveButtons(
      from,
      MSG.PUSH_DECISION,
      [
        { id: `sales_reserve_${p.id}`, title: MSG.BTN_RESERVE },
        { id: 'sales_cheaper', title: MSG.BTN_CHEAPER },
        { id: 'sales_no_thanks', title: MSG.BTN_NO_THANKS },
      ]
    );
  }
}

export async function showCategoryList(from: string, merchantId: string, metaProvider: MetaCloudProvider) {
  const baseQuery = supabaseAdmin
    .from('products')
    .select('category')
    .not('category', 'is', null)
    .eq('is_active', true)
    .order('category');

  const { data: categories, error } = merchantId
    ? await baseQuery.eq('merchant_id', merchantId)
    : await baseQuery;

  if (error || !categories) {
    console.error('Error fetching categories:', error);
    await metaProvider.sendMessage(from, 'No pudimos cargar las categorías. Por favor, escribí el nombre del producto que buscás 🔍');
    return;
  }

  const uniqueCategories = Array.from(new Set(categories.map(c => c.category)));

  if (uniqueCategories.length === 0) {
    await metaProvider.sendMessage(from, 'No hay categorías disponibles. Por favor, escribí el nombre del producto que buscás 🔍');
    return;
  }

  if (uniqueCategories.length <= 3) {
    await metaProvider.sendInteractiveButtons(
      from,
      'Elegí una categoría 👇',
      uniqueCategories.map(cat => ({ id: `sales_cat_${cat}`, title: cat })),
      MSG.SEARCH_HEADER(uniqueCategories.length)
    );
  } else {
    await metaProvider.sendList(
      from,
      'Elegí una categoría para empezar 👇',
      "Ver categorías",
      [
        {
          title: "Categorías disponibles",
          rows: uniqueCategories.map(cat => ({ id: `sales_cat_${cat}`, title: cat })),
        },
      ],
      MSG.SEARCH_HEADER(uniqueCategories.length)
    );
  }
}

async function showCategoryProducts(from: string, category: string, merchantId: string, metaProvider: MetaCloudProvider) {
  const baseQuery = supabaseAdmin
    .from('products')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('total_reservations', { ascending: false })
    .limit(10);

  const { data: products, error } = merchantId
    ? await baseQuery.eq('merchant_id', merchantId)
    : await baseQuery;

  if (error || !products || products.length === 0) {
    await metaProvider.sendMessage(from, `No encontré productos en la categoría ${category}. Intentá buscar por nombre 🔍`);
    return;
  }

  await metaProvider.sendList(
    from,
    `Productos más populares de ${category} 👇`,
    "Ver productos",
    [
      {
        title: '🔥 MÁS ELEGIDOS',
        rows: products.map(p => ({
          id: `sales_reserve_${p.id}`,
          title: truncate(p.name, 24),
          description: `$${p.price}`,
        })),
      },
    ],
    MSG.SEARCH_HEADER(products.length)
  );

  const top = products[0];
  await metaProvider.sendInteractiveButtons(
    from,
    '¿Te interesa alguno de estos? 👇',
    [
      { id: `sales_reserve_${top.id}`, title: MSG.BTN_RESERVE },
      { id: 'sales_cheaper', title: MSG.BTN_CHEAPER },
      { id: 'sales_no_thanks', title: MSG.BTN_NO_THANKS },
    ]
  );
}

async function scheduleFollowUp(conversationId: string, productId: string, productName: string) {
  const days = [1, 3, 7];
  const followUps = days.map(day => ({
    conversation_id: conversationId,
    product_id: productId,
    product_name: productName,
    follow_up_day: day,
    scheduled_at: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin.from('follow_ups').insert(followUps);
  if (error) console.error('Error scheduling follow-ups:', error);
}

export async function handleSalesMessage(
  from: string,
  text: string,
  merchantId: string,
  conversationId: string,
  salesFlow: SalesFlowState | null,
  metaProvider: MetaCloudProvider
): Promise<SalesFlowState | null> {
  const trimmedText = text.toLowerCase().trim();

  if (salesFlow === null) {
    const products = await searchProducts(text, merchantId);

    const normalized = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ');
    const { error: analyticsErr } = await supabaseAdmin.from('queries').insert({
      search_term: text,
      normalized_search_term: normalized,
      results_count: products.length,
      resolved_bool: products.length > 0,
      conversation_id: conversationId || null,
    });
    if (analyticsErr) console.error('Analytics error:', analyticsErr);

    if (products.length === 0) {
      await metaProvider.sendInteractiveButtons(
        from,
        MSG.NO_RESULTS,
        [
          { id: 'menu_search', title: MSG.BTN_SEARCH },
          { id: 'menu_talk', title: MSG.BTN_TALK },
        ]
      );
      return null;
    }

    await showProductOptions(from, products, metaProvider);

    return {
      step: 'opciones',
      lastQuery: text,
      shownProductIds: products.map(p => p.id),
      topProductId: products[0].id,
      topProductName: products[0].name,
      topProductPrice: parseFloat(products[0].price as any),
      followUpScheduled: false,
    };
  }

  if (salesFlow.step === 'opciones') {
    if (isConfirmation(trimmedText)) {
      const code = generateReservationCode();
      await createReservation({ conversationId, productId: salesFlow.topProductId, notes: code });
      await metaProvider.sendMessage(from, MSG.RESERVE_CONFIRM(salesFlow.topProductName, code));
      await scheduleFollowUp(conversationId, salesFlow.topProductId, salesFlow.topProductName);
      return null;
    }

    if (isDoubtCheaper(trimmedText)) {
      await metaProvider.sendMessage(from, MSG.DOUBT_CHEAPER);
      const products = await searchProducts(salesFlow.lastQuery, merchantId);
      const cheaperProducts = products.filter(p => parseFloat(p.price as any) < salesFlow.topProductPrice);

      if (cheaperProducts.length === 0) {
        await metaProvider.sendMessage(from, 'No encontré nada más barato, pero estas son las mejores opciones 👇');
        await showProductOptions(from, products, metaProvider);
      } else {
        await showProductOptions(from, cheaperProducts, metaProvider);
      }
      return { ...salesFlow, shownProductIds: cheaperProducts.length > 0 ? cheaperProducts.map(p => p.id) : products.map(p => p.id) };
    }

    if (isDoubtBetter(trimmedText)) {
      await metaProvider.sendMessage(from, MSG.DOUBT_BETTER);
      const products = await searchProducts(salesFlow.lastQuery, merchantId);
      const betterProducts = products.filter(p => parseFloat(p.price as any) > salesFlow.topProductPrice);

      if (betterProducts.length === 0) {
        await metaProvider.sendMessage(from, 'No encontré nada de gama alta, pero estas son las mejores opciones 👇');
        await showProductOptions(from, products, metaProvider);
      } else {
        await showProductOptions(from, betterProducts, metaProvider);
      }
      return { ...salesFlow, shownProductIds: betterProducts.length > 0 ? betterProducts.map(p => p.id) : products.map(p => p.id) };
    }

    if (isNegation(trimmedText)) {
      await metaProvider.sendMessage(from, MSG.NO_FOLLOWUP_RESPONSE);
      return null;
    }

    const newProducts = await searchProducts(text, merchantId);
    if (newProducts.length === 0) {
      await metaProvider.sendInteractiveButtons(
        from,
        MSG.NO_RESULTS,
        [
          { id: 'menu_search', title: MSG.BTN_SEARCH },
          { id: 'menu_talk', title: MSG.BTN_TALK },
        ]
      );
      return null;
    }
    await showProductOptions(from, newProducts, metaProvider);
    return {
      step: 'opciones',
      lastQuery: text,
      shownProductIds: newProducts.map(p => p.id),
      topProductId: newProducts[0].id,
      topProductName: newProducts[0].name,
      topProductPrice: parseFloat(newProducts[0].price as any),
      followUpScheduled: false,
    };
  }

  return null;
}

export async function handleSalesInteractive(
  from: string,
  replyId: string,
  merchantId: string,
  conversationId: string,
  salesFlow: SalesFlowState | null,
  metaProvider: MetaCloudProvider
): Promise<SalesFlowState | null> {
  const { type, productId, categoryName } = parseReserveButtonId(replyId);

  if (type === 'category') {
    const catName = categoryName || '';
    await showCategoryProducts(from, catName, merchantId, metaProvider);
    return {
      step: 'opciones',
      selectedCategory: catName,
      lastQuery: catName,
      shownProductIds: [],
      topProductId: '',
      topProductName: '',
      topProductPrice: 0,
      followUpScheduled: false,
    };
  }

  if (type === 'reserve') {
    if (!productId) return salesFlow;

    const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', productId).single();
    const productName = product?.name || 'Producto';

    const code = generateReservationCode();
    await createReservation({ conversationId, productId, notes: code });
    await metaProvider.sendMessage(from, MSG.RESERVE_CONFIRM(productName, code));
    await scheduleFollowUp(conversationId, productId, productName);
    return null;
  }

  if (type === 'cheaper') {
    await metaProvider.sendMessage(from, MSG.DOUBT_CHEAPER);
    if (!salesFlow) return salesFlow;
    const products = await searchProducts(salesFlow.lastQuery, merchantId);
    const cheaperProducts = products.filter(p => parseFloat(p.price as any) < salesFlow.topProductPrice);

    if (cheaperProducts.length === 0) {
      await metaProvider.sendMessage(from, 'No encontré nada más barato, pero estas son las mejores opciones 👇');
      await showProductOptions(from, products, metaProvider);
    } else {
      await showProductOptions(from, cheaperProducts, metaProvider);
    }
    return { ...salesFlow, shownProductIds: cheaperProducts.length > 0 ? cheaperProducts.map(p => p.id) : products.map(p => p.id) };
  }

  if (type === 'more') {
    if (!salesFlow) return salesFlow;
    const products = await searchProducts(salesFlow.lastQuery, merchantId);
    await showProductOptions(from, products, metaProvider);
    return salesFlow;
  }

  if (type === 'no_thanks') {
    await metaProvider.sendMessage(from, MSG.NO_FOLLOWUP_RESPONSE);
    return null;
  }

  return salesFlow;
}
