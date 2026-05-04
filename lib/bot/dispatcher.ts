import { MetaCloudProvider } from '../messaging/meta-cloud';
import { searchProducts } from '@/lib/search/products';
import { normalizeQuery } from '@/lib/search/intent-parser';
import { supabaseAdmin } from '@/lib/utils/supabase';
import { createReservation } from '@/lib/services/reservationService';

/**
 * Generate a random reservation code (8 alphanumeric characters)
 */
function generateReservationCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

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
  merchantId: string = '',
  conversationId: string = ''
): Promise<void> {
  // Check if the message is a reservation request
  const lowerMessage = message.toLowerCase().trim();
  if (lowerMessage.includes('reservar')) {
    const productQuery = lowerMessage.replace('reservar', '').trim();

    if (!productQuery) {
      await metaProvider.sendMessage(from, 'Por favor indicá qué producto querés reservar. Ejemplo: "reservar pizza"').catch(() => {});
      return;
    }

    if (!conversationId) {
      await metaProvider.sendMessage(from, 'No pudimos identificar tu conversación. Por favor, intentá nuevamente.').catch(() => {});
      return;
    }

    try {
      const products = await searchProducts(productQuery, merchantId);
      const topProduct = products[0];

      if (!topProduct) {
        await metaProvider.sendMessage(from, 'No encontré ese producto. Por favor, especificá mejor qué querés reservar.').catch(() => {});
        return;
      }

      // Generate reservation code
      const reservationCode = generateReservationCode();

      // Create reservation in the database
      await createReservation({
        conversationId,
        productId: topProduct.id,
        quantity: 1,
        status: 'pending',
        notes: reservationCode, // Store the code in notes for reference
      });

      // Send confirmation to the user
      await metaProvider.sendMessage(
        from,
        `Su reserva ha sido creada con éxito.\n\nCódigo de reserva: ${reservationCode}\nProducto: ${topProduct.name}\nCantidad: 1\nEstado: Pendiente\n\nGracias por su compra.`
      );

      // Log notification for merchant (in a real app, you might send a WhatsApp template message or email)
      console.log(`New reservation for merchant ${merchantId}: Code ${reservationCode}, Product ${topProduct.name}, Conversation ${conversationId}`);

      return; // Exit early to avoid normal product search flow
    } catch (error) {
      console.error('Error processing reservation:', error);
      await metaProvider.sendMessage(from, 'Hubo un error al procesar su reserva. Por favor, intente nuevamente.');
      return;
    }
  }

  // If not a reservation request, proceed with normal product search
  try {
    // Search products using the raw message and merchantId (searchProducts handles intent parsing and reranking internally)
    const products = await searchProducts(message, merchantId);

    // Save query to DB for analytics / gap tracking
    const { error: queryInsertErr } = await supabaseAdmin.from('queries').insert({
      search_term: message,
      normalized_search_term: normalizeQuery(message),
      results_count: products.length,
      resolved_bool: products.length > 0,
      conversation_id: conversationId || null,
    });
    if (queryInsertErr) console.error('Failed to save query:', queryInsertErr);

    let responseMessage: string;
    if (products.length === 0) {
      responseMessage = 'Lo siento, no encontré productos que coincidan con tu búsqueda.';
      logUnresolvedQuery(message);
    } else {
      responseMessage = composeResponse(products);
    }

    await metaProvider.sendMessage(from, responseMessage).catch(err => {
      console.error('[Meta] sendMessage failed — check META_ACCESS_TOKEN and recipient whitelist:', {
        error: (err as Error).message,
        to: from,
        merchantId,
      });
    });
  } catch (error) {
    console.error('Error in dispatcher:', error);
    // Best-effort error reply — ignore if send fails (e.g., invalid token in dev)
    await metaProvider.sendMessage(from, 'Hubo un error procesando tu mensaje. Por favor, intenta nuevamente.')
      .catch(err => {
        console.error('[Meta] sendMessage (error reply) failed:', (err as Error).message, { to: from });
      });
  }
}