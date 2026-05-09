import { MetaCloudProvider } from '../messaging/meta-cloud';
import { searchProducts } from '@/lib/search/products';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { MSG, parseReserveButtonId, isGreeting, isMenuRequest } from './messages';
import { detectarIntencionPasador, manejarSolicitud, manejarComando, manejarPostulacion } from '@/lib/pasador/flows';
import { getOrCreateConversationContext, setConversationContext } from '@/lib/services/pasadorService';
import { handleSalesMessage, handleSalesInteractive, SalesFlowState, showCategoryList } from './sales-flow';
import { manejarMerchantPostulacion } from '@/lib/bot/merchant-flow';
import { cancelarCompra } from '@/lib/services/compraService';
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
    MSG.SEARCH_HEADER(4)
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
      const { url: downloadUrl, mimeType } = await metaProvider.getMediaInfo(mediaId);
      const buffer = await metaProvider.downloadMedia(downloadUrl);
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const fileName = `dni/${Date.now()}-${mediaId}.${ext}`;
      const { error } = await supabaseAdmin.storage
        .from('documentos')
        .upload(fileName, buffer, { contentType: mimeType, upsert: true });
      if (error) {
        console.error('[resolveMediaUrls] Storage upload failed:', error.message, error);
        continue;
      }
      const { data: urlData } = supabaseAdmin.storage.from('documentos').getPublicUrl(fileName);
      urls.push(urlData.publicUrl);
    } catch (err) {
      console.error('[resolveMediaUrls] Failed to process media:', mediaId, err);
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

  // Cancel order button (may appear from any context)
  if (replyId.startsWith('cancel_orden_')) {
    const compraId = replyId.replace('cancel_orden_', '');
    await cancelarCompra(compraId).catch(() => {});
    await setConversationContext(conversationId, { ...ctx, sales_flow: null } as unknown as Json).catch(() => {});
    await sendWelcome(from);
    return;
  }

  if (replyId === 'cancel_chat') {
    await setConversationContext(conversationId, {} as unknown as Json).catch(() => {});
    await sendWelcome(from);
    return;
  }

  if (replyId === 'seguir_comprando') {
    await metaProvider.sendMessage(from, '¡Seguí eligiendo! 🛒').catch(() => {});
    return;
  }

  if (replyId.startsWith('rating_')) {
    const [, scoreStr, viajeIdStr] = replyId.split('_');
    const score = parseInt(scoreStr, 10);
    const viajeId = parseInt(viajeIdStr, 10);
    const { data: viaje } = await supabaseAdmin.from('viajes')
      .select('pasador_id, id').eq('id', viajeId).single();
    const { data: compra } = await supabaseAdmin.from('compras')
      .select('id').eq('viaje_id', viajeId).maybeSingle();
    
    await supabaseAdmin.from('ratings').insert({
      viaje_id: viajeId, compra_id: compra?.id ?? null,
      wa_user_id: from, pasador_id: viaje?.pasador_id ?? null, score
    }).select().maybeSingle(); // Ensure we don't throw if conflict is ignored or handled
    
    if (viaje?.pasador_id) {
      const { data: ratingStats } = await supabaseAdmin
        .from('ratings').select('score').eq('pasador_id', viaje.pasador_id);
      if (ratingStats && ratingStats.length > 0) {
        const avg = ratingStats.reduce((s, r) => s + (r.score as number), 0) / ratingStats.length;
        await supabaseAdmin.from('pasadores').update({ reputacion_promedio: avg }).eq('id', viaje.pasador_id);
      }
    }
    await metaProvider.sendMessage(from, `⭐ ¡Gracias por tu calificación! Esto nos ayuda a mejorar el servicio.`).catch(() => {});
    return;
  }

  // Merchant category selection buttons
  if (replyId.startsWith('comercio_cat_done_')) {
    const postulacionId = replyId.replace('comercio_cat_done_', '');
    await setConversationContext(conversationId, { ...ctx, comercio_paso: `direccion:${postulacionId}` } as unknown as Json).catch(() => {});
    await metaProvider.sendMessage(from, '📍 ¿Cuál es la dirección del local?\n(calle, número, ciudad)').catch(() => {});
    return;
  }

  if (replyId.startsWith('comercio_cat_mas_')) {
    const postulacionId = replyId.replace('comercio_cat_mas_', '');
    const { data: current } = await supabaseAdmin.from('postulaciones_comercio').select('categoria_productos').eq('id', postulacionId).single();
    const seleccionadas = current?.categoria_productos ? current.categoria_productos.split(', ') : [];
    const metaProviderRef = metaProvider;
    // Re-send the category list excluding already selected
    const cats: string[] = [];
    const { data: dbCats } = await supabaseAdmin.from('products').select('category').eq('is_active', true).not('category', 'is', null);
    for (const r of dbCats ?? []) if (r.category) cats.push(r.category);
    const FIXED = ['Alimentos', 'Ropa', 'Calzado', 'Electrónica', 'Hogar', 'Accesorios', 'Otro'];
    const merged = Array.from(new Set([...cats, ...FIXED])).filter(c => !seleccionadas.includes(c));
    const rows = merged.slice(0, 10).map(cat => ({ id: `comercio_cat_${postulacionId}_${cat}`, title: cat }));
    if (rows.length > 0) {
      if (rows.length <= 3) {
        await metaProviderRef.sendInteractiveButtons(from, '¿Qué otra categoría vendés? 👇', rows).catch(() => {});
      } else {
        await metaProviderRef.sendList(from, 'Elegí otra categoría 👇', 'Ver categorías', [{ title: 'Categorías', rows }]).catch(() => {});
      }
    } else {
      await metaProviderRef.sendMessage(from, 'Ya no hay más categorías. Escribí "listo" para continuar.').catch(() => {});
    }
    await setConversationContext(conversationId, { ...ctx, comercio_paso: `categoria_mas:${postulacionId}` } as unknown as Json).catch(() => {});
    return;
  }

  if (replyId.startsWith('comercio_cat_')) {
    // Format: comercio_cat_<postulacionId>_<categoryName>
    const rest = replyId.replace('comercio_cat_', '');
    const underscoreIdx = rest.indexOf('_');
    if (underscoreIdx === -1) return;
    const postulacionId = rest.slice(0, underscoreIdx);
    const catName = rest.slice(underscoreIdx + 1);
    const { data: current } = await supabaseAdmin.from('postulaciones_comercio').select('categoria_productos').eq('id', postulacionId).single();
    const existing = current?.categoria_productos ? `${current.categoria_productos}, ${catName}` : catName;
    await supabaseAdmin.from('postulaciones_comercio').update({ categoria_productos: existing }).eq('id', postulacionId);
    await metaProvider.sendInteractiveButtons(
      from,
      `✅ *${catName}* guardada.\n¿Querés agregar otra categoría?`,
      [
        { id: `comercio_cat_mas_${postulacionId}`, title: 'Agregar otra ➕' },
        { id: `comercio_cat_done_${postulacionId}`, title: 'Listo ✔️' },
      ]
    ).catch(() => {});
    await setConversationContext(conversationId, { ...ctx, comercio_paso: `categoria_mas:${postulacionId}` } as unknown as Json).catch(() => {});
    return;
  }

  // Sales flow interactive buttons
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
      const respuesta = await manejarMerchantPostulacion(from, 'inicio', '', [], metaProvider);
      const [msg, nextPaso] = respuesta.split('|||');
      await setConversationContext(conversationId, { ...ctx, comercio_paso: nextPaso ?? 'nombre' } as unknown as Json).catch(() => {});
      if (msg.trim()) await metaProvider.sendMessage(from, msg).catch(() => {});
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

  let ctx: Record<string, unknown> = {};
  if (conversationId) {
    ctx = ((await getOrCreateConversationContext(conversationId)) ?? {}) as Record<string, unknown>;
  }

  const { data: roleRow } = await supabaseAdmin
    .from('user_roles').select('role').eq('wa_user_id', from).maybeSingle();
  
  if (!roleRow) {
    await supabaseAdmin.from('user_roles').insert({ wa_user_id: from, role: 'buyer' });
    await sendWelcome(from);
    return;
  }

  const userRole = roleRow.role ?? 'buyer';

  if (userRole === 'merchant' && (trimmed.startsWith('*') || ctx.merchant_product_flow)) {
    if (!ctx.sales_flow && !ctx.pasador_flow && !ctx.postulacion_paso && !ctx.comercio_paso) {
       const { handleMerchantProductCommand } = await import('./merchant-products-flow');
       const handled = await handleMerchantProductCommand(from, message, mediaIds, ctx, conversationId);
       if (handled) return;
    }
  }

  if (trimmed.startsWith('*')) {
    const resp = await manejarComando(from, trimmed.substring(1));
    await metaProvider.sendMessage(from, resp).catch(() => {});
    return;
  }

  // Enhanced cancel UX: disambiguate order cancel vs conversation cancel
  if (lower === 'cancelar') {
    if (conversationId) {
      const { data: compra } = await supabaseAdmin
        .from('compras')
        .select('id, codigo_seguridad')
        .eq('wa_user_id', from)
        .eq('estado', 'pendiente_pago')
        .maybeSingle();

      if (compra) {
        await metaProvider.sendInteractiveButtons(
          from,
          '¿Qué querés cancelar?',
          [
            { id: `cancel_orden_${compra.id}`, title: 'Cancelar orden ❌' },
            { id: 'cancel_chat', title: 'Cancelar chat 💬' },
            { id: 'seguir_comprando', title: 'Seguir comprando 🛒' },
          ]
        ).catch(() => {});
        return;
      }

      await setConversationContext(conversationId, {} as unknown as Json).catch(() => {});
    }
    await sendWelcome(from);
    return;
  }

  if (conversationId) {
    if (ctx.pasador_flow) {
      let ctxToProcess = ctx;
      if ((ctx.pasador_flow as Record<string, unknown>).step === 'ubicacion' && trimmed.startsWith('LOCATION:')) {
        const [latStr, lngStr] = trimmed.replace('LOCATION:', '').split(',');
        ctxToProcess = {
          ...ctx,
          pasador_flow: {
            ...(ctx.pasador_flow as Record<string, unknown>),
            data: {
              ...(ctx.pasador_flow as Record<string, unknown>).data as Record<string, unknown>,
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
      const respuesta = await manejarMerchantPostulacion(from, ctx.comercio_paso as string, trimmed, imagenes, metaProvider);
      const [msg, nextPaso] = respuesta.split('|||');
      const updatedCtx = nextPaso
        ? { ...ctx, comercio_paso: nextPaso }
        : { ...ctx, comercio_paso: null };
      await setConversationContext(conversationId, updatedCtx as unknown as Json).catch(() => {});
      if (msg.trim()) await metaProvider.sendMessage(from, msg).catch(() => {});
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
