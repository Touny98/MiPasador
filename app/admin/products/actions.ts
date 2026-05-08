'use server';

import { supabaseAdmin } from '@/lib/utils/supabase/admin';

export async function createProduct(formData: FormData) {
  const merchant_id = formData.get('merchant_id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = formData.get('price') as string;
  const currency = formData.get('currency') as string;
  const sku = formData.get('sku') as string;
  const category = formData.get('category') as string;
  const stock = formData.get('stock') as string;
  const stock_actual = formData.get('stock_actual') as string;
  const precio_bob = formData.get('precio_bob') as string;
  const precio_ars = formData.get('precio_ars') as string;
  const image_url = formData.get('image_url') as string;

  const stockVal = parseInt(stock, 10) || 0;
  const stockActualVal = stock_actual ? parseInt(stock_actual, 10) : stockVal;

  const { error } = await supabaseAdmin
    .from('products')
    .insert([
      {
        merchant_id,
        name,
        description,
        price: parseFloat(price),
        currency,
        sku,
        category: category || null,
        stock: stockVal,
        stock_actual: stockActualVal,
        precio_bob: precio_bob ? parseFloat(precio_bob) : null,
        precio_ars: precio_ars ? parseFloat(precio_ars) : null,
        image_url: image_url || null,
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
  const price = formData.get('price') as string;
  const currency = formData.get('currency') as string;
  const sku = formData.get('sku') as string;
  const category = formData.get('category') as string;
  const stock = formData.get('stock') as string;
  const stock_actual = formData.get('stock_actual') as string;
  const precio_bob = formData.get('precio_bob') as string;
  const precio_ars = formData.get('precio_ars') as string;
  const image_url = formData.get('image_url') as string;

  const stockVal = parseInt(stock, 10) || 0;

  const { error } = await supabaseAdmin
    .from('products')
    .update({
      merchant_id,
      name,
      description,
      price: parseFloat(price),
      currency,
      sku,
      category: category || null,
      stock: stockVal,
      stock_actual: stock_actual ? parseInt(stock_actual, 10) : stockVal,
      precio_bob: precio_bob ? parseFloat(precio_bob) : null,
      precio_ars: precio_ars ? parseFloat(precio_ars) : null,
      image_url: image_url || null,
    })
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