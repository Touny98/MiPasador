import { MetaCloudProvider } from '../messaging/meta-cloud';
import { searchProducts } from '@/lib/search/products';
import { normalizeQuery } from '@/lib/search/intent-parser';
import { supabaseAdmin } from '@/lib/utils/supabase';

// Initialize MetaCloudProvider (credentials from env)
const metaProvider = new MetaCloudProvider(
  process.env.META_ACCESS_TOKEN!,
  process.env.META_PHONE_NUMBER_ID!
);

/**
 * Composes a response message from the products.
 */
function composeResponse(products: any[]): string {
  if (products.length === 0) {
    return 'Lo siento, no encontré productos que coincidan con tu búsqueda.';
  }

  let response = 'Encontré los siguientes productos:\n\n';
  products.forEach((product, index) => {
    response += `${index + 1}. ${product.name} - $${product.price}\n`;
    response += `   ${product.description}\n\n`;
  });
  return response.trim();
}

/**
 * Logs that the query was not resolved (for analytics).
 */
function logUnresolvedQuery(query: string) {
  // In a real app, you might insert into a logs table
  console.warn(`Unresolved query: ${query}`);
  // We'll just log to console for now
}

/**
 * Main dispatcher function.
 * @param from - The sender's WhatsApp number
 * @param message - The text message received
 * @param merchantId - The ID of the merchant (business) to which the message is directed
 */
export async function handleIncomingMessage(
  from: string,
  message: string,
  merchantId: string
): Promise<void> {
  try {
    // Search products using the raw message and merchantId (searchProducts handles intent parsing and reranking internally)
    const products = await searchProducts(message, merchantId);

    // Save query to DB for analytics / gap tracking
    const { error: queryInsertErr } = await supabaseAdmin.from('queries').insert({
      search_term: message,
      normalized_search_term: normalizeQuery(message),
      results_count: products.length,
      resolved_bool: products.length > 0,
    });
    if (queryInsertErr) console.error('Failed to save query:', queryInsertErr);

    let responseMessage: string;
    if (products.length === 0) {
      responseMessage = 'Lo siento, no encontré productos que coincidan con tu búsqueda.';
      logUnresolvedQuery(message);
    } else {
      responseMessage = composeResponse(products);
    }

    // Send the response via WhatsApp (best-effort — may fail in dev with invalid token)
    await metaProvider.sendMessage(from, responseMessage).catch(err => {
      console.warn('WhatsApp send failed (non-fatal in dev):', (err as Error).message);
    });
  } catch (error) {
    console.error('Error in dispatcher:', error);
    // Best-effort error reply — ignore if send fails (e.g., invalid token in dev)
    await metaProvider.sendMessage(from, 'Hubo un error procesando tu mensaje. Por favor, intenta nuevamente.')
      .catch(() => {});
  }
}