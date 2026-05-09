import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { MetaCloudProvider } from '../messaging/meta-cloud';
import { getOrCreateConversationContext, setConversationContext } from '@/lib/services/pasadorService';
import type { Json } from '@/lib/database.types';

const metaProvider = new MetaCloudProvider(
  process.env.META_ACCESS_TOKEN!,
  process.env.META_PHONE_NUMBER_ID!
);

export type MerchantProductFlowState =
  | { step: 'nombre' }
  | { step: 'precio'; nombre: string }
  | { step: 'categoria'; nombre: string; precio: number }
  | { step: 'foto'; nombre: string; precio: number; categoria: string }
  | { step: 'stock'; nombre: string; precio: number; categoria: string; imageUrl: string | null }
  | { step: 'edit_stock'; sku: string };

export async function resolveMediaUrls(mediaIds: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const mediaId of mediaIds) {
    try {
      const { url: downloadUrl, mimeType } = await metaProvider.getMediaInfo(mediaId);
      const buffer = await metaProvider.downloadMedia(downloadUrl);
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const fileName = `productos/${Date.now()}-${mediaId}.${ext}`;
      const { error } = await supabaseAdmin.storage
        .from('productos')
        .upload(fileName, buffer, { contentType: mimeType, upsert: true });
      if (error) {
        console.error('[resolveMediaUrls] Storage upload failed:', error.message, error);
        continue;
      }
      const { data: urlData } = supabaseAdmin.storage.from('productos').getPublicUrl(fileName);
      urls.push(urlData.publicUrl);
    } catch (err) {
      console.error('[resolveMediaUrls] Failed to process media:', mediaId, err);
    }
  }
  return urls;
}

export async function handleMerchantProductCommand(
  from: string,
  message: string,
  mediaIds: string[],
  ctx: Record<string, unknown>,
  conversationId: string
): Promise<boolean> {
  const trimmed = message.trim();
  const upper = trimmed.toUpperCase();

  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('id, name')
    .eq('wa_user_id', from)
    .maybeSingle();

  if (!merchant) {
    await metaProvider.sendMessage(from, '❌ No estás registrado como comerciante.');
    return true; // handled
  }

  // Handle active flow
  if (ctx.merchant_product_flow) {
    const flow = ctx.merchant_product_flow as MerchantProductFlowState;
    if (upper === '*CANCELAR') {
      await setConversationContext(conversationId, { ...ctx, merchant_product_flow: null } as unknown as Json);
      await metaProvider.sendMessage(from, '❌ Creación de producto cancelada.');
      return true;
    }

    if (flow.step === 'nombre') {
      const nombre = trimmed;
      await setConversationContext(conversationId, {
        ...ctx,
        merchant_product_flow: { step: 'precio', nombre }
      } as unknown as Json);
      await metaProvider.sendMessage(from, `Escribí el precio en ARS para *${nombre}* (solo números):`);
      return true;
    }

    if (flow.step === 'precio') {
      const precio = parseFloat(trimmed);
      if (isNaN(precio)) {
        await metaProvider.sendMessage(from, '❌ Por favor ingresá un número válido.');
        return true;
      }
      await setConversationContext(conversationId, {
        ...ctx,
        merchant_product_flow: { step: 'categoria', nombre: flow.nombre, precio }
      } as unknown as Json);
      
      // Fetch categories
      const { data: cats } = await supabaseAdmin.from('products').select('category').not('category', 'is', null);
      const uniqueCats = Array.from(new Set(cats?.map(c => c.category) || []));
      await metaProvider.sendMessage(from, `Elegí una categoría o escribí una nueva:\n${uniqueCats.join(', ')}`);
      return true;
    }

    if (flow.step === 'categoria') {
      const categoria = trimmed;
      await setConversationContext(conversationId, {
        ...ctx,
        merchant_product_flow: { step: 'foto', nombre: flow.nombre, precio: flow.precio, categoria }
      } as unknown as Json);
      await metaProvider.sendMessage(from, 'Enviá una foto del producto, o escribí "SALTEAR" para continuar sin foto.');
      return true;
    }

    if (flow.step === 'foto') {
      let imageUrl: string | null = null;
      if (mediaIds.length > 0) {
        const urls = await resolveMediaUrls(mediaIds);
        if (urls.length > 0) imageUrl = urls[0];
      } else if (upper !== 'SALTEAR') {
        await metaProvider.sendMessage(from, '❌ Enviá una imagen, o escribí "SALTEAR".');
        return true;
      }

      await setConversationContext(conversationId, {
        ...ctx,
        merchant_product_flow: { 
          step: 'stock', 
          nombre: flow.nombre, 
          precio: flow.precio, 
          categoria: flow.categoria,
          imageUrl 
        }
      } as unknown as Json);
      await metaProvider.sendMessage(from, '¿Qué cantidad de stock actual tenés? (ej: 10)');
      return true;
    }

    if (flow.step === 'stock') {
      const stock = parseInt(trimmed, 10);
      if (isNaN(stock)) {
        await metaProvider.sendMessage(from, '❌ Por favor ingresá un número entero válido.');
        return true;
      }

      // Generate a temporary SKU
      const sku = `${merchant.id.substring(0,4).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      
      const { error } = await supabaseAdmin.from('products').insert({
        merchant_id: merchant.id,
        name: flow.nombre,
        precio_ars: flow.precio,
        category: flow.categoria,
        image_url: flow.imageUrl,
        stock_actual: stock,
        sku: sku,
        is_active: false,
        moderation_status: 'pending',
        currency: 'ARS'
      });

      if (error) {
        await metaProvider.sendMessage(from, `❌ Error al guardar producto: ${error.message}`);
      } else {
        await metaProvider.sendMessage(from, `✅ Producto *${flow.nombre}* creado con éxito.\nSKU: ${sku}\nEl producto pasará por moderación antes de estar visible.`);
      }

      await setConversationContext(conversationId, { ...ctx, merchant_product_flow: null } as unknown as Json);
      return true;
    }
  }

  // Handle commands
  if (upper === '*MIS_PRODUCTOS') {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('name, precio_ars, stock_actual, sku, moderation_status')
      .eq('merchant_id', merchant.id);
      
    if (!products || products.length === 0) {
      await metaProvider.sendMessage(from, 'No tenés productos cargados. Usá *NUEVO_PRODUCTO para empezar.');
      return true;
    }

    const lines = products.map(p => 
      `📦 *${p.name}*\n💰 $${p.precio_ars} | 🔢 Stock: ${p.stock_actual}\n🔖 SKU: ${p.sku} | ⚙️ ${p.moderation_status}`
    );
    await metaProvider.sendMessage(from, `Tus productos:\n\n${lines.join('\n\n')}`);
    return true;
  }

  if (upper === '*NUEVO_PRODUCTO') {
    await setConversationContext(conversationId, {
      ...ctx,
      merchant_product_flow: { step: 'nombre' }
    } as unknown as Json);
    await metaProvider.sendMessage(from, 'Empecemos. ¿Cuál es el nombre del producto?\n(Podés escribir *CANCELAR para abortar)');
    return true;
  }

  if (upper.startsWith('*STOCK ')) {
    const args = trimmed.split(' ');
    if (args.length < 3) {
      await metaProvider.sendMessage(from, '❌ Uso: *STOCK {sku} {cantidad}');
      return true;
    }
    const sku = args[1];
    const newStock = parseInt(args[2], 10);
    
    if (isNaN(newStock)) {
      await metaProvider.sendMessage(from, '❌ Cantidad inválida.');
      return true;
    }

    const { data: prod } = await supabaseAdmin.from('products')
      .select('id')
      .eq('sku', sku)
      .eq('merchant_id', merchant.id)
      .maybeSingle();

    if (!prod) {
      await metaProvider.sendMessage(from, '❌ SKU no encontrado o no te pertenece.');
      return true;
    }

    await supabaseAdmin.from('products').update({ stock_actual: newStock }).eq('id', prod.id);
    await metaProvider.sendMessage(from, `✅ Stock de ${sku} actualizado a ${newStock}.`);
    return true;
  }

  // Si no matcheó un comando conocido de merchant y no está en flow
  return false;
}
