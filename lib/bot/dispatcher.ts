import { MetaCloudProvider } from '../messaging/meta-cloud';
import { searchProducts } from '@/lib/search/products';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { MSG, parseReserveButtonId, isGreeting, isMenuRequest } from './messages';
import { detectarIntencionPasador, manejarSolicitud, manejarComando, manejarPostulacion } from '@/lib/pasador/flows';
import { getOrCreateConversationContext, setConversationContext } from '@/lib/services/pasadorService';
import { handleSalesMessage, handleSalesInteractive, SalesFlowState, showCategoryList } from './sales-flow';
import { manejarMerchantPostulacion } from '@/lib/bot/merchant-flow';
import type { Json } from '@/lib/database.types';

const metaProvider = new MetaCloudProvider(
  process.env.META_ACCESS_TOKEN!,
  process.env.META_PHONE_NUMBER_ID!
);

async function sendWelcome(from: string): Promise<void> {
  await metaProvider.sendList(
    from,
    MSG.WELCOME(),
    "Ver opciones",
    [
      {
        title: "Opciones principales",
        rows: [
          { id: 'sales_search', title: '🔍 Buscar producto' },
          { id: 'pasador_search', title: '🚶 Buscar pasador' },
          { id: 'postular_search', title: '💼 Quiero ser pasador' },
          { id: 'publicar_negocio', title: '🏪 Publicar mi negocio' },
        ],
      },
    ],
    MSG.SEARCH_HEADER(4) // Repurposing this for the list header
  ).catch(() => {});
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
    case 'sales_search':
    case 'menu_search': {
      await showCategoryList(from, merchantId, metaProvider);
      await setConversationContext(conversationId, { ...ctx, sales_flow: { step: 'eligiendo_categoria' } } as unknown as Json);
      break;
    }
    case 'pasador_search': {
      const { respuesta, estado } = await manejarSolicitud(from, '', ctx);
      await setConversationContext(conversationId, { ...ctx, pasador_flow: estado } as unknown as Json).catch(() => {});
      await metaProvider.sendMessage(from, respuesta).catch(() => {});
      break;
    }
    case 'postular_search': {
      const respuesta = await manejarPostulacion(from, 'inicio', '');
      const [msg, nextPaso] = respuesta.split('|||');
      await setConversationContext(conversationId, { ...ctx, postulacion_paso: nextPaso ?? 'nombre' } as unknown as Json).catch(() => {});
      await metaProvider.sendMessage(from, msg).catch(() => {});
      break;
    }
    case 'peso_chico': {
      const { respuesta, estado } = await manejarSolicitud(from, '5', ctx);
      await setConversationContext(conversationId, { ...ctx, pasador_flow: estado } as unknown as Json).catch(() => {});
      await metaProvider.sendMessage(from, respuesta).catch(() => {});
      break;
    }
    case 'peso_medio': {
      const { respuesta, estado } = await manejarSolicitud(from, '15', ctx);
      await setConversationContext(conversationId, { ...ctx, pasador_flow: estado } as unknown as Json).catch(() => {});
      await metaProvider.sendMessage(from, respuesta).catch(() => {});
      break;
    }
    case 'peso_grande': {
      const { respuesta, estado } = await manejarSolicitud(from, '25', ctx);
      await setConversationContext(conversationId, { ...ctx, pasador_flow: estado } as unknown as Json).catch(() => {});
      await metaProvider.sendMessage(from, respuesta).catch(() => {});
      break;
    }
    case 'publicar_negocio': {
      const respuesta = await manejarMerchantPostulacion(from, 'inicio', '');
      const [msg, nextPaso] = respuesta.split('|||');
      await setConversationContext(conversationId, { ...ctx, comercio_paso: nextPaso ?? 'nombre' } as unknown as Json).catch(() => {});
      await metaProvider.sendMessage(from, msg).catch(() => {});
      break;
    }
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

  if (lower === 'cancelar') {
    if (conversationId) {
      await setConversationContext(conversationId, {} as unknown as Json).catch(() => {});
    }
    await sendWelcome(from);
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

      if (estado.step === 'peso') {
        const updatedCtxPeso = { ...ctx, pasador_flow: estado };
        await setConversationContext(conversationId, updatedCtxPeso as unknown as Json).catch(() => {});
        await metaProvider.sendInteractiveButtons(
          from,
          '⚖️ ¿Cuánto pesa el bulto?',
          [
            { id: 'peso_chico', title: 'Menos de 5 kg' },
            { id: 'peso_medio', title: '5 a 20 kg' },
            { id: 'peso_grande', title: 'Más de 20 kg' },
          ]
        ).catch(() => {});
        return;
      }

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

    if (ctx.comercio_paso) {
      const imagenes = mediaIds.length > 0 ? await resolveMediaUrls(mediaIds) : [];
      const respuesta = await manejarMerchantPostulacion(from, ctx.comercio_paso as string, trimmed, imagenes);
      const [msg, nextPaso] = respuesta.split('|||');
      const updatedCtx = nextPaso
        ? { ...ctx, comercio_paso: nextPaso }
        : { ...ctx, comercio_paso: null };
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
