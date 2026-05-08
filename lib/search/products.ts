import { supabase } from '@/lib/utils/supabase';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { normalizeQuery, parseIntent, rerank } from './intent-parser';

// Search products using pg_trgm via RPC and then rerank with intent
export async function searchProducts(rawQuery: string, merchantId: string) {
  // Step 1: Normalize the query
  const normalized = normalizeQuery(rawQuery);

  // Step 2: Parse intent (we might use the intent for filtering or weighting later)
  const intent = parseIntent(normalized);

  // Step 3: Use the RPC function to search products with pg_trgm
  // Pass null when no merchant so the function searches across all merchants
  const merchantParam = merchantId && merchantId.length > 0 ? merchantId : undefined;
  const { data: products, error } = await supabase
    .rpc('search_products', { query_text: normalized, merchant: merchantParam });

  if (error) throw error;
  return rerank(products ?? [], intent);
}

export async function getCategorias(merchantId?: string): Promise<string[]> {
  let query = supabaseAdmin
    .from('products')
    .select('category')
    .eq('is_active', true)
    .gt('stock_actual', 0)
    .not('category', 'is', null);

  if (merchantId) query = query.eq('merchant_id', merchantId);

  const { data, error } = await query;
  if (error) {
    console.error('[getCategorias] error:', error.message);
    return [];
  }

  const seen = new Set<string>();
  for (const row of data ?? []) {
    if (row.category) seen.add(row.category);
  }
  return Array.from(seen).sort();
}

export async function getProductosPorCategoria(
  categoria: string,
  offset: number,
  limit = 3,
  merchantId?: string
): Promise<{
  id: string;
  name: string;
  precio_ars: number | null;
  precio_bob: number | null;
  image_url: string | null;
  stock_actual: number | null;
  merchant_id: string | null;
}[]> {
  let query = supabaseAdmin
    .from('products')
    .select('id, name, precio_ars, precio_bob, image_url, stock_actual, merchant_id')
    .eq('is_active', true)
    .eq('category', categoria)
    .gt('stock_actual', 0)
    .order('total_reservations', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (merchantId) query = query.eq('merchant_id', merchantId);

  const { data, error } = await query;
  if (error) {
    console.error('[getProductosPorCategoria] error:', error.message);
    return [];
  }
  return (data ?? []) as typeof data extends null ? [] : NonNullable<typeof data>;
}