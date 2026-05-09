import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { MetaCloudProvider } from '@/lib/messaging/meta-cloud';
import { getCategorias, getProductosPorCategoria, getSubcategorias } from '@/lib/search/products';
import {
  generarCodigoSeguridad,
  reducirStock,
  crearCompra,
  cancelarCompra,
  liberarStock,
} from '@/lib/services/compraService';
import { generarLinkPago, verificarPago, registrarEvento } from '@/lib/pagos/mercadopago';
import { MSG, parseReserveButtonId } from '@/lib/bot/messages';

export type SalesFlowState =
  | { step: 'eligiendo_categoria' }
  | { step: 'eligiendo_subcategoria'; categoria: string }
  | { step: 'viendo_productos'; categoria: string; subcategoria?: string; offset: number }
  | { step: 'esperando_pago'; compraId: string; productoId: string }
  | { step: 'eligiendo_pasador'; compraId: string; productoId: string }
  | { step: 'capturando_peso_pasador'; compraId: string }
  | { step: 'capturando_dir_pasador'; compraId: string; pesoKg: number };

export async function showCategoryList(
  from: string,
  merchantId: string,
  metaProvider: MetaCloudProvider
): Promise<void> {
  const cats = await getCategorias(merchantId || undefined);

  if (cats.length === 0) {
    await metaProvider.sendMessage(from, 'No hay productos disponibles ahora. Volvé pronto 🙏');
    return;
  }

  if (cats.length <= 3) {
    await metaProvider.sendInteractiveButtons(
      from,
      '¿Qué categoría te interesa? 👇',
      cats.map((cat) => ({ id: `sales_cat_${cat}`, title: cat }))
    );
  } else {
    await metaProvider.sendList(
      from,
      'Elegí una categoría para ver productos 👇',
      'Ver categorías',
      [{ title: 'Categorías disponibles', rows: cats.map((cat) => ({ id: `sales_cat_${cat}`, title: cat })) }]
    );
  }
}

async function showProductos(
  from: string,
  categoria: string,
  subcategoria: string | undefined,
  offset: number,
  merchantId: string,
  metaProvider: MetaCloudProvider
): Promise<void> {
  const productos = await getProductosPorCategoria(categoria, offset, 3, merchantId || undefined, subcategoria);

  if (productos.length === 0) {
    if (offset === 0) {
      await metaProvider.sendMessage(from, `No quedan productos en ${categoria} 😔\nEscribí "cancelar" para volver al menú.`);
    } else {
      await metaProvider.sendInteractiveButtons(
        from,
        `No hay más productos en ${categoria}.`,
        [{ id: 'sales_search', title: 'Ver categorías' }]
      );
    }
    return;
  }

  for (const p of productos) {
    let comercioNombre: string | null = null;
    if (p.merchant_id) {
      const { data: m } = await supabaseAdmin.from('merchants').select('name').eq('id', p.merchant_id).single();
      comercioNombre = m?.name ?? null;
    }

    const buttons: { id: string; title: string }[] = [
      { id: `buy_${p.id}`, title: 'Comprar 🛒' },
    ];
    if (productos.indexOf(p) === productos.length - 1) {
      buttons.push({ id: 'cat_next', title: 'Ver más' });
    }

    await metaProvider.sendProductoCard(
      from,
      {
        imageUrl: p.image_url,
        nombre: p.name,
        precioBob: p.precio_bob,
        precioArs: p.precio_ars,
        comercio: comercioNombre,
        stock: p.stock_actual,
      },
      buttons
    ).catch(() => {});

    await supabaseAdmin.from('analytics_eventos').insert({
      tipo: 'product_impression',
      producto_id: p.id,
      wa_user_id: from,
      merchant_id: p.merchant_id,
    });
  }
}

async function asignarPasadorParaViaje(viajeId: number): Promise<{ id: number; nombre_completo: string | null } | null> {
  const { data: candidatos } = await supabaseAdmin
    .from('pasadores')
    .select('id, nombre_completo')
    .eq('activo', true)
    .eq('estado', 'disponible')
    .order('reputacion_promedio', { ascending: false })
    .order('cantidad_viajes_completados', { ascending: false });

  for (const p of candidatos ?? []) {
    const { data, error } = await supabaseAdmin
      .from('viajes')
      .update({ pasador_id: p.id, estado: 'asignado' })
      .eq('id', viajeId)
      .is('pasador_id', null)
      .eq('estado', 'pendiente')
      .select('id')
      .maybeSingle();
    if (data && !error) return p;
  }
  return null;
}

async function iniciarEntregaPasador(
  from: string,
  compraId: string,
  pesoKg: number,
  lat: number,
  lng: number,
  merchantId: string,
  metaProvider: MetaCloudProvider
): Promise<void> {
  const { data: compra } = await supabaseAdmin
    .from('compras')
    .select('producto_id, codigo_seguridad')
    .eq('id', compraId)
    .single();

  let origenDir = 'Bermejo';
  if (merchantId) {
    const { data: m } = await supabaseAdmin.from('merchants').select('address, name').eq('id', merchantId).single();
    if (m?.address) origenDir = m.address;
  }

  const destino = `${lat},${lng}`;

  const { data: tarifa } = await supabaseAdmin
    .from('tarifas_pasador')
    .select('precio_ars')
    .eq('ruta', 'bermejo-aguas_blancas')
    .eq('activa', true)
    .lte('peso_min', pesoKg)
    .gte('peso_max', pesoKg)
    .single();

  const precioArs = tarifa?.precio_ars ?? 0;

  const { data: viaje, error: vErr } = await supabaseAdmin
    .from('viajes')
    .insert({
      usuario_wa_id: from,
      ruta: 'bermejo-aguas_blancas',
      peso: pesoKg,
      precio_ars: precioArs,
      comision_ars: Math.round(precioArs * 0.1),
      direccion_origen: origenDir,
      direccion_destino: destino,
      estado: 'pendiente',
      codigo_seguridad: compra?.codigo_seguridad ?? null,
    })
    .select('id')
    .single();

  if (vErr || !viaje) {
    await metaProvider.sendMessage(from, 'No pudimos crear el viaje. Intentá de nuevo 😔').catch(() => {});
    return;
  }

  await supabaseAdmin.from('compras').update({ viaje_id: viaje.id, estado: 'en_preparacion', solicito_pasador: true }).eq('id', compraId);

  const pasador = await asignarPasadorParaViaje(viaje.id);

  if (pasador) {
    const { data: pasadorInfo } = await supabaseAdmin.from('pasadores')
      .select('wa_user_id').eq('id', pasador.id).single();
    if (pasadorInfo?.wa_user_id) {
      await metaProvider.sendMessage(pasadorInfo.wa_user_id,
        `📦 Nuevo paquete asignado\n🔐 Código: *${compra?.codigo_seguridad}*\nRetirá en: ${origenDir}\nUsá *RETIRAR ${compra?.codigo_seguridad} cuando retires.`
      ).catch(() => {});
    }

    await metaProvider.sendMessage(
      from,
      `✅ *Pasador asignado*\n👤 ${pasador.nombre_completo ?? 'Nuestro pasador'}\n📦 Peso: ${pesoKg} kg\n💵 Tarifa: $${precioArs} ARS\n⏱️ Estimado: 20–30 min\n🔐 Código: ${compra?.codigo_seguridad ?? ''}`
    ).catch(() => {});
  } else {
    await metaProvider.sendMessage(
      from,
      `📦 Pedido registrado. Buscando pasador disponible...\n🔐 Código: ${compra?.codigo_seguridad ?? ''}\nTe avisamos cuando asignemos uno ⏳`
    ).catch(() => {});
  }
}

export async function handleSalesMessage(
  from: string,
  text: string,
  merchantId: string,
  conversationId: string,
  salesFlow: SalesFlowState | null,
  metaProvider: MetaCloudProvider
): Promise<SalesFlowState | null> {
  if (!salesFlow) return null;

  if (salesFlow.step === 'viendo_productos') {
    await metaProvider.sendMessage(from, 'Usá los botones para elegir o escribí "cancelar" para volver al menú 👆').catch(() => {});
    return salesFlow;
  }

  if (salesFlow.step === 'esperando_pago') {
    const lower = text.toLowerCase().trim();
    if (lower.includes('pagué') || lower.includes('pague') || lower === 'ya pagué' || lower === 'ya pague') {
      const { data: compra } = await supabaseAdmin.from('compras').select('mp_payment_id').eq('id', salesFlow.compraId).single();
      if (compra?.mp_payment_id) {
        const status = await verificarPago(compra.mp_payment_id);
        if (status === 'approved') {
          await registrarEvento(salesFlow.compraId, 'approved', {}).catch(() => {});
          await supabaseAdmin.from('compras').update({ estado: 'pagado', updated_at: new Date().toISOString() }).eq('id', salesFlow.compraId);
          await supabaseAdmin.from('products').update({ total_reservations: supabaseAdmin.rpc as never }).eq('id', salesFlow.productoId);
          const { data: p } = await supabaseAdmin.from('products').select('total_reservations').eq('id', salesFlow.productoId).single();
          await supabaseAdmin.from('products').update({ total_reservations: ((p?.total_reservations as number | null) ?? 0) + 1 }).eq('id', salesFlow.productoId);
          await liberarStock(salesFlow.productoId, true);
          await metaProvider.sendInteractiveButtons(
            from,
            '✅ *Pago confirmado*\n¿Querés que un pasador te lo lleve? 🚶',
            [
              { id: `pasador_si_${salesFlow.compraId}`, title: 'Sí, con pasador' },
              { id: `pasador_no_${salesFlow.compraId}`, title: 'No, lo retiro' },
            ]
          ).catch(() => {});
          return { step: 'eligiendo_pasador', compraId: salesFlow.compraId, productoId: salesFlow.productoId };
        }
      }
      await metaProvider.sendInteractiveButtons(
        from,
        '⏳ Tu pago aún no fue acreditado. Esperá unos minutos e intentá de nuevo.',
        [
          { id: `paid_${salesFlow.compraId}`, title: 'Ya pagué ✅' },
          { id: `cancel_orden_${salesFlow.compraId}`, title: 'Cancelar orden' },
        ]
      ).catch(() => {});
      return salesFlow;
    }
    return salesFlow;
  }

  if (salesFlow.step === 'capturando_peso_pasador') {
    if (text.startsWith('LOCATION:')) {
      await metaProvider.sendMessage(from, 'Primero decime el peso del bulto en kg 📦').catch(() => {});
      return salesFlow;
    }
    const peso = parseFloat(text.replace(',', '.'));
    if (isNaN(peso) || peso <= 0) {
      await metaProvider.sendMessage(from, 'Por favor, ingresá el peso en kg (ej: 3.5) 📦').catch(() => {});
      return salesFlow;
    }
    await metaProvider.sendLocationRequest(from, '📍 Ahora compartí tu ubicación de entrega').catch(() => {});
    return { step: 'capturando_dir_pasador', compraId: salesFlow.compraId, pesoKg: peso };
  }

  if (salesFlow.step === 'capturando_dir_pasador') {
    if (text.startsWith('LOCATION:')) {
      const [latStr, lngStr] = text.replace('LOCATION:', '').split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        await iniciarEntregaPasador(from, salesFlow.compraId, salesFlow.pesoKg, lat, lng, merchantId, metaProvider);
        return null;
      }
    }
    await metaProvider.sendLocationRequest(from, '📍 Compartí tu ubicación de entrega').catch(() => {});
    return salesFlow;
  }

  return salesFlow;
}

export async function handleSalesInteractive(
  from: string,
  replyId: string,
  merchantId: string,
  conversationId: string,
  salesFlow: SalesFlowState | null,
  metaProvider: MetaCloudProvider
): Promise<SalesFlowState | null> {
  const { type, productId, compraId, categoryName } = parseReserveButtonId(replyId);

  if (type === 'category') {
    const cat = categoryName ?? '';
    const subcats = await getSubcategorias(cat, merchantId);
    if (subcats.length > 0) {
      if (subcats.length <= 3) {
        await metaProvider.sendInteractiveButtons(
          from,
          `¿Qué buscas en ${cat}? 👇`,
          subcats.map((sc) => ({ id: `sales_subcat_${sc}`, title: sc }))
        );
      } else {
        await metaProvider.sendList(
          from,
          `Elegí una opción para ${cat} 👇`,
          'Ver opciones',
          [{ title: cat, rows: subcats.map((sc) => ({ id: `sales_subcat_${sc}`, title: sc })) }]
        );
      }
      return { step: 'eligiendo_subcategoria', categoria: cat };
    }
    await showProductos(from, cat, undefined, 0, merchantId, metaProvider);
    return { step: 'viendo_productos', categoria: cat, offset: 0 };
  }

  if (type === 'subcat') {
    if (!salesFlow || salesFlow.step !== 'eligiendo_subcategoria') return salesFlow;
    const subcat = categoryName ?? '';
    await showProductos(from, salesFlow.categoria, subcat, 0, merchantId, metaProvider);
    return { step: 'viendo_productos', categoria: salesFlow.categoria, subcategoria: subcat, offset: 0 };
  }

  if (type === 'cat_next') {
    if (!salesFlow || salesFlow.step !== 'viendo_productos') return salesFlow;
    const nextOffset = salesFlow.offset + 3;
    await showProductos(from, salesFlow.categoria, salesFlow.subcategoria, nextOffset, merchantId, metaProvider);
    return { step: 'viendo_productos', categoria: salesFlow.categoria, subcategoria: salesFlow.subcategoria, offset: nextOffset };
  }

  if (type === 'buy') {
    if (!productId) return salesFlow;

    const { data: product } = await supabaseAdmin
      .from('products')
      .select('name, precio_ars, precio_bob, stock_actual, merchant_id')
      .eq('id', productId)
      .single();

    if (!product || (product.stock_actual as number | null ?? 0) <= 0) {
      await metaProvider.sendMessage(from, 'Lo sentimos, ese producto ya no tiene stock 😔').catch(() => {});
      return salesFlow;
    }

    const puedeComprar = await reducirStock(productId);
    if (!puedeComprar) {
      await metaProvider.sendMessage(from, 'Lo sentimos, ese producto ya no tiene stock 😔').catch(() => {});
      return salesFlow;
    }

    const codigo = generarCodigoSeguridad();
    const precioArs = (product.precio_ars as number | null) ?? 0;

    const { link, mpPaymentId } = await generarLinkPago({
      compraId: 'temp',
      codigo,
      titulo: product.name as string,
      precioArs,
    });

    let compra;
    try {
      compra = await crearCompra({
        productoId: productId,
        conversationId,
        waUserId: from,
        codigoSeguridad: codigo,
        precioArs,
        paymentLink: link,
        mpPaymentId,
      });
    } catch (err) {
      console.error('[buy] crearCompra failed:', err);
      await liberarStock(productId, false);
      await metaProvider.sendMessage(from, MSG.GENERIC_ERROR).catch(() => {});
      return salesFlow;
    }

    if (product.merchant_id) {
      const { data: m } = await supabaseAdmin.from('merchants')
        .select('wa_user_id, name').eq('id', product.merchant_id).maybeSingle();
      if (m?.wa_user_id) {
        await metaProvider.sendMessage(m.wa_user_id,
          `🛒 Nueva venta!\n📦 ${product.name}\n🔐 Código: *${codigo}*\nEsperá al pasador con este código.`
        ).catch(() => {});
      }
    }

    await supabaseAdmin.from('analytics_eventos').insert({
      tipo: 'product_click', producto_id: productId, wa_user_id: from
    });

    await metaProvider.sendInteractiveButtons(
      from,
      `🛒 *Pedido #${codigo}*\n📦 ${product.name}\n💵 $${precioArs} ARS\n\n💳 Pagá aquí: ${link}\n\n⏱️ Tenés 30 min para completar el pago.`,
      [
        { id: `paid_${compra.id}`, title: 'Ya pagué ✅' },
        { id: `cancel_orden_${compra.id}`, title: 'Cancelar orden' },
      ]
    ).catch(() => {});

    return { step: 'esperando_pago', compraId: compra.id, productoId: productId };
  }

  if (type === 'paid') {
    if (!compraId) return salesFlow;

    const { data: compra } = await supabaseAdmin
      .from('compras')
      .select('mp_payment_id, producto_id, estado')
      .eq('id', compraId)
      .single();

    if (!compra || compra.estado !== 'pendiente_pago') return salesFlow;

    const productoId = (compra.producto_id as string | null) ?? '';

    if (compra.mp_payment_id) {
      const status = await verificarPago(compra.mp_payment_id as string);
      if (status === 'approved') {
        await registrarEvento(compraId, 'approved', {}).catch(() => {});
        await supabaseAdmin.from('compras').update({ estado: 'pagado', updated_at: new Date().toISOString() }).eq('id', compraId);
        if (productoId) {
          const { data: p } = await supabaseAdmin.from('products').select('total_reservations').eq('id', productoId).single();
          await supabaseAdmin.from('products').update({ total_reservations: ((p?.total_reservations as number | null) ?? 0) + 1 }).eq('id', productoId);
          await liberarStock(productoId, true);
        }
        await metaProvider.sendInteractiveButtons(
          from,
          '✅ *Pago confirmado*\n¿Querés que un pasador te lo lleve? 🚶',
          [
            { id: `pasador_si_${compraId}`, title: 'Sí, con pasador' },
            { id: `pasador_no_${compraId}`, title: 'No, lo retiro' },
          ]
        ).catch(() => {});
        const currentFlow = salesFlow as ({ productoId?: string } & SalesFlowState) | null;
        return { step: 'eligiendo_pasador', compraId, productoId: currentFlow?.step === 'esperando_pago' ? (currentFlow as { compraId: string; productoId: string }).productoId : productoId };
      }
    }

    await metaProvider.sendInteractiveButtons(
      from,
      '⏳ Tu pago aún no fue acreditado. Esperá unos minutos.',
      [
        { id: `paid_${compraId}`, title: 'Ya pagué ✅' },
        { id: `cancel_orden_${compraId}`, title: 'Cancelar orden' },
      ]
    ).catch(() => {});

    return salesFlow;
  }

  if (type === 'pasador_si') {
    if (!compraId) return salesFlow;
    await metaProvider.sendMessage(from, '⚖️ ¿Cuánto pesa el bulto aproximadamente? (en kg)\nEj: 2.5').catch(() => {});
    return { step: 'capturando_peso_pasador', compraId };
  }

  if (type === 'pasador_no') {
    if (!compraId) return salesFlow;
    await supabaseAdmin.from('compras').update({ estado: 'listo_retirar', updated_at: new Date().toISOString() }).eq('id', compraId);

    const { data: compra } = await supabaseAdmin.from('compras').select('codigo_seguridad, producto_id').eq('id', compraId).single();
    let merchantInfo = '';
    if (merchantId) {
      const { data: m } = await supabaseAdmin.from('merchants').select('name, address, horario').eq('id', merchantId).single();
      if (m) merchantInfo = `\n🏪 ${m.name}${m.address ? `\n📍 ${m.address}` : ''}${m.horario ? `\n🕐 ${m.horario}` : ''}`;
    }

    await metaProvider.sendMessage(
      from,
      `✅ *Pedido listo para retirar*${merchantInfo}\n\n🔐 Código: *${compra?.codigo_seguridad ?? ''}*\nPresentá este código al retirar.`
    ).catch(() => {});

    return null;
  }

  // Legacy reserve flow (backwards compat)
  if (type === 'reserve') {
    if (!productId) return salesFlow;
    const { data: product } = await supabaseAdmin.from('products').select('name, precio_ars').eq('id', productId).single();
    await metaProvider.sendMessage(from, `Para comprar *${product?.name ?? ''}* escribí "comprar" o usá el botón 🛒`).catch(() => {});
    return salesFlow;
  }

  if (type === 'no_thanks') {
    await metaProvider.sendMessage(from, MSG.NO_FOLLOWUP_RESPONSE).catch(() => {});
    return null;
  }

  return salesFlow;
}
