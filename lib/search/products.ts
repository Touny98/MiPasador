import { supabase } from '@/lib/utils/supabase';
import { normalizeQuery, parseIntent, rerank } from './intent-parser';

// Search products using pg_trgm via RPC and then rerank with intent
export async function searchProducts(rawQuery: string, merchantId: string) {
  // Step 1: Normalize the query
  const normalized = normalizeQuery(rawQuery);

  // Step 2: Parse intent (we might use the intent for filtering or weighting later)
  const intent = parseIntent(normalized);

  // Step 3: Use the RPC function to search products with pg_trgm
  // Pass null when no merchant so the function searches across all merchants
  const merchantParam = merchantId && merchantId.length > 0 ? merchantId : null;
  const { data: products, error } = await supabase
    .rpc('search_products', { query_text: normalized, merchant: merchantParam });

  if (error) throw error;
  return rerank(products ?? [], intent);
}