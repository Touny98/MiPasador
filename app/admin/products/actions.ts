'use server';

import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { MetaCloudProvider } from '@/lib/messaging/meta-cloud';

export async function createProduct(formData: FormData) {
  const merchant_id = formData.get('merchant_id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const sku = formData.get('sku') as string;
  const category = formData.get('category') as string;
  const subcategory = formData.get('subcategory') as string;
  const stock = formData.get('stock') as string;
  const stock_actual = formData.get('stock_actual') as string;
  const precio_ars = formData.get('precio_ars') as string;
  const image_file = formData.get('image_file') as File | null;

  const stockVal = parseInt(stock, 10) || 0;
  const stockActualVal = stock_actual ? parseInt(stock_actual, 10) : stockVal;

  let finalImageUrl: string | null = null;
  if (image_file && image_file.size > 0) {
    const ext = image_file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const arrayBuffer = await image_file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { error: uploadError } = await supabaseAdmin.storage
      .from('productos')
      .upload(fileName, buffer, { contentType: image_file.type, upsert: true });
    
    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage.from('productos').getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;
    }
  }

  const { error } = await supabaseAdmin
    .from('products')
    .insert([
      {
        merchant_id,
        name,
        description,
        sku,
        category: category || null,
        subcategory: subcategory || null,
        stock: stockVal,
        stock_actual: stockActualVal,
        precio_ars: precio_ars ? parseFloat(precio_ars) : null,
        currency: 'ARS',
        image_url: finalImageUrl,
      }
    ]);

  if (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

export async function updateProduct(id: string, formData: FormData) {
  const merchant_id = formData.get('merchant_id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const sku = formData.get('sku') as string;
  const category = formData.get('category') as string;
  const subcategory = formData.get('subcategory') as string;
  const stock = formData.get('stock') as string;
  const stock_actual = formData.get('stock_actual') as string;
  const precio_ars = formData.get('precio_ars') as string;
  const image_file = formData.get('image_file') as File | null;

  const stockVal = parseInt(stock, 10) || 0;

  const updatePayload: any = {
    merchant_id,
    name,
    description,
    sku,
    category: category || null,
    subcategory: subcategory || null,
    stock: stockVal,
    stock_actual: stock_actual ? parseInt(stock_actual, 10) : stockVal,
    precio_ars: precio_ars ? parseFloat(precio_ars) : null,
  };

  if (image_file && image_file.size > 0) {
    const ext = image_file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const arrayBuffer = await image_file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { error: uploadError } = await supabaseAdmin.storage
      .from('productos')
      .upload(fileName, buffer, { contentType: image_file.type, upsert: true });
    
    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage.from('productos').getPublicUrl(fileName);
      updatePayload.image_url = urlData.publicUrl;
    }
  }

  const { error } = await supabaseAdmin
    .from('products')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function deleteProduct(id: string) {
  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

export async function aprobarProducto(id: string) {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .update({ moderation_status: 'approved', is_active: true })
    .eq('id', id)
    .select('name, merchant_id')
    .single();

  if (!error && product?.merchant_id) {
    const { data: m } = await supabaseAdmin.from('merchants').select('wa_user_id').eq('id', product.merchant_id).maybeSingle();
    if (m?.wa_user_id) {
      const meta = new MetaCloudProvider(process.env.META_ACCESS_TOKEN!, process.env.META_PHONE_NUMBER_ID!);
      await meta.sendMessage(m.wa_user_id, `✅ Tu producto *${product.name}* fue aprobado y ya está en el catálogo.`).catch(() => {});
    }
  }
}

export async function rechazarProducto(id: string, motivo?: string) {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .update({ moderation_status: 'rejected', is_active: false })
    .eq('id', id)
    .select('name, merchant_id')
    .single();

  if (!error && product?.merchant_id) {
    const { data: m } = await supabaseAdmin.from('merchants').select('wa_user_id').eq('id', product.merchant_id).maybeSingle();
    if (m?.wa_user_id) {
      const meta = new MetaCloudProvider(process.env.META_ACCESS_TOKEN!, process.env.META_PHONE_NUMBER_ID!);
      await meta.sendMessage(m.wa_user_id, `❌ Tu producto *${product.name}* fue rechazado.${motivo ? ` Motivo: ${motivo}` : ''}`).catch(() => {});
    }
  }
}