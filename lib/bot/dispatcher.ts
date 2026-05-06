import { MetaCloudProvider } from '../messaging/meta-cloud';
import { searchProducts } from '@/lib/search/products';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { MSG, parseReserveButtonId, isGreeting, isMenuRequest } from './messages';
import { detectarIntencionPasador, manejarSolicitud, manejarComando, manejarPostulacion } from '@/lib/pasador/flows';
import { getOrCreateConversationContext, setConversationContext } from '@/lib/services/pasadorService';
import { handleSalesMessage, handleSalesInteractive, SalesFlowState } from './sales-flow';
import type { Json } from '@/lib/database.types';

const metaProvider = new MetaCloudProvider(
  process.env.META_ACCESS_TOKEN!,
  process.env.META_PHONE_NUMBER_ID!
);

async function sendWelcome(from: string): Promise<void> {
  await metaProvider.sendMessage(from, MSG.WELCOME()).catch(() => {});
}

async function sendMenu(from: string): Promise<void> {
  await metaProvider.sendInteractiveButtons(
    from,
    MSG.CONFUSION,
    [
      { id: 'menu_search', title: MSG.BTN_SEARCH },
      { id: 'menu_talk', title: MSG.BTN_TALK },
    ]
  ).catch(() => {});
}

async function resolveMediaUrls(mediaIds: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const mediaId of mediaIds) {
    try {
      const downloadUrl = await metaProvider.getMediaUrl(mediaId);
      const buffer = await metaProvider.downloadMedia(downloadUrl);
      const fileName = `dni/${Date.now()}-${mediaId}.jpg`;
      const { error } = await supabaseAdmin.storage
        .from('documentos')
        .upload(fileName, buffer, { contentType: 'image/jpeg' });
      if (error) {
        console.error('Failed to upload DNI image:', error);
        continue;
      }
      const { data: urlData } = supabaseAdmin.storage.from('documentos').getPublicUrl(fileName);
      urls.push(urlData.publicUrl);
    } catch (err) {
      console.error('Failed to resolve media URL:', err);
    }
  }
  return urls;
}

export async function handleInteractiveMessage(
  from: string,
  replyId: string,
  merchantId: string,
  conversationId: string
): Promise<void> {
  if (!conversationId) return;
  const ctx = ((await getOrCreateConversationContext(conversationId)) ?? {}) as Record<string, unknown>;
  const salesFlow = (ctx.sales_flow ?? null) as SalesFlowState | null;

  const { type } = parseReserveButtonId(replyId);
  if (type !== 'unknown') {
    const newSalesFlow = await handleSalesInteractive(from, replyId, merchantId, conversationId, salesFlow, metaProvider);
    await setConversationContext(conversationId, { ...ctx, sales_flow: newSalesFlow } as unknown as Json);
    return;
  }

  switch (replyId) {
    case 'menu_search':
      await metaProvider.sendMessage(from, 'Escribí el nombre del producto que buscás 🔍').catch(() => {});
      break;
    case 'menu_talk':
      await metaProvider.sendMessage(from, 'Un momento 🙏 Alguien te va a atender pronto.').catch(() => {});
      break;
    default:
      await metaProvider.sendMessage(from, MSG.GENERIC_ERROR).catch(() => {});
  }
}

export async function handleIncomingMessage(
  from: string,
  message: string,
  merchantId: string = '',
  conversationId: string = '',
  mediaIds: string[] = []
): Promise<void> {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (trimmed.startsWith('*')) {
    const resp = await manejarComando(from, trimmed.substring(1));
    await metaProvider.sendMessage(from, resp).catch(() => {});
    return;
  }

  let ctx: Record<string, unknown> = {};
  if (conversationId) {
    ctx = ((await getOrCreateConversationContext(conversationId)) ?? {}) as Record<string, unknown>;

    if (ctx.pasador_flow) {
      let ctxToProcess = ctx;
      if ((ctx.pasador_flow as any).step === 'ubicacion' && trimmed.startsWith('LOCATION:')) {
        const [latStr, lngStr] = trimmed.replace('LOCATION:', '').split(',');
        ctxToProcess = {
          ...ctx,
          pasador_flow: {
            ...(ctx.pasador_flow as any),
            data: {
              ...(ctx.pasador_flow as any).data,
              ubicacion: { lat: parseFloat(latStr), lng: parseFloat(lngStr) },
            },
          },
        };
      }
      const { respuesta, estado } = await manejarSolicitud(from, trimmed, ctxToProcess);
      const updatedCtx = estado.step === 'inicio'
        ? { ...ctx, pasador_flow: null }
        : { ...ctx, pasador_flow: estado };
      await setConversationContext(conversationId, updatedCtx as unknown as Json).catch(() => {});
      await metaProvider.sendMessage(from, respuesta).catch(() => {});
      return;
    }

    if (ctx.postulacion_paso) {
      const imagenes = mediaIds.length > 0 ? await resolveMediaUrls(mediaIds) : [];
      const respuesta = await manejarPostulacion(from, ctx.postulacion_paso as string, trimmed, imagenes);
      const [msg, nextPaso] = respuesta.split('|||');
      const updatedCtx = nextPaso
        ? { ...ctx, postulacion_paso: nextPaso }
        : { ...ctx, postulacion_paso: null };
      await setConversationContext(conversationId, updatedCtx as unknown as Json).catch(() => {});
      await metaProvider.sendMessage(from, msg).catch(() => {});
      return;
    }
  }

  if (isGreeting(lower)) {
    if (conversationId && ctx.sales_flow) {
      await setConversationContext(conversationId, { ...ctx, sales_flow: null } as unknown as Json).catch(() => {});
    }
    await sendWelcome(from);
    return;
  }

  if (isMenuRequest(lower)) {
    await sendMenu(from);
    return;
  }

  if (conversationId) {
    const intencion = detectarIntencionPasador(lower);
    if (intencion === 'solicitar') {
      const { respuesta, estado } = await manejarSolicitud(from, trimmed, ctx);
      await setConversationContext(conversationId, { ...ctx, pasador_flow: estado } as unknown as Json).catch(() => {});
      await metaProvider.sendMessage(from, respuesta).catch(() => {});
      return;
    }
    if (intencion === 'postular') {
      const respuesta = await manejarPostulacion(from, 'inicio', trimmed);
      const [msg, nextPaso] = respuesta.split('|||');
      await setConversationContext(conversationId, { ...ctx, postulacion_paso: nextPaso ?? 'nombre' } as unknown as Json).catch(() => {});
      await metaProvider.sendMessage(from, msg).catch(() => {});
      return;
    }

    const salesFlow = (ctx.sales_flow ?? null) as SalesFlowState | null;
    const newSalesFlow = await handleSalesMessage(from, trimmed, merchantId, conversationId, salesFlow, metaProvider);
    if (newSalesFlow !== null) {
      await setConversationContext(conversationId, { ...ctx, sales_flow: newSalesFlow } as unknown as Json).catch(() => {});
    } else if (ctx.sales_flow !== null) {
      // If newSalesFlow is null and there was a flow, we must explicitly clear it in the DB
      await setConversationContext(conversationId, { ...ctx, sales_flow: null } as unknown as Json).catch(() => {});
    }

    return;
  }

  if (trimmed === '') return;
  const products = await searchProducts(trimmed, merchantId);
  if (products.length === 0) {
    await metaProvider.sendMessage(from, MSG.NO_RESULTS).catch(() => {});
  } else {
    const p = products[0];
    await metaProvider.sendMessage(from, `${p.name} — $${p.price}`).catch(() => {});
  }
}
