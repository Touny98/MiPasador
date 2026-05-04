import { MetaCloudProvider } from '../messaging/meta-cloud';
import { searchProducts } from '@/lib/search/products';

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

    let responseMessage: string;
    if (products.length === 0) {
      responseMessage = 'Lo siento, no encontré productos que coincidan con tu búsqueda.';
      logUnresolvedQuery(message);
    } else {
      responseMessage = composeResponse(products);
    }

    // Send the response via WhatsApp
    await metaProvider.sendMessage(from, responseMessage);
  } catch (error) {
    console.error('Error in dispatcher:', error);
    // Optionally, send an error message to the user
    await metaProvider.sendMessage(from, 'Hubo un error procesando tu mensaje. Por favor, intenta nuevamente.');
  }
}