import { supabaseAdmin as supabase } from '@/lib/utils/supabase';
import { WhatsAppMessage } from '@/lib/messaging/types';

/**
 * Save an incoming WhatsApp message to the database
 * @param message The WhatsApp message object from webhook
 * @param phoneNumberId The WhatsApp Business phone number ID from webhook metadata
 */
export async function saveIncomingMessage(message: WhatsAppMessage, phoneNumberId?: string) {
  try {
    // 1. Find or create merchant based on phone_number_id
    let merchantId: string | null = null;
    if (phoneNumberId) {
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id')
        .eq('whatsapp_business_id', phoneNumberId)
        .single();

      if (merchantError && merchantError.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error('Error fetching merchant:', merchantError);
        throw merchantError;
      }

      if (merchantData) {
        merchantId = merchantData.id;
      } else {
        // Create a new merchant if not found (you may want to customize this)
        const { data: newMerchant, error: insertError } = await supabase
          .from('merchants')
          .insert({
            whatsapp_business_id: phoneNumberId,
            name: `WhatsApp Business ${phoneNumberId}`,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating merchant:', insertError);
          throw insertError;
        }

        if (newMerchant) {
          merchantId = newMerchant.id;
        }
      }
    }

    // 2. Find or create conversation for the user
    const userWhatsAppId = message.from;
    let conversationId: string | null = null;

    let convQuery = supabase
      .from('conversations')
      .select('id')
      .eq('user_whatsapp_id', userWhatsAppId);
    // If we have a merchant_id, also filter by it; otherwise, get any conversation for this user
    if (merchantId) {
      convQuery = convQuery.eq('merchant_id', merchantId);
    }
    const { data: conversationData, error: conversationError } = await convQuery.single();

    if (conversationError && conversationError.code !== 'PGRST116') {
      console.error('Error fetching conversation:', conversationError);
      throw conversationError;
    }

    if (conversationData) {
      conversationId = conversationData.id;
    } else {
      // Create new conversation
      const { data: newConversation, error: insertError } = await supabase
        .from('conversations')
        .insert({
          user_whatsapp_id: userWhatsAppId,
          merchant_id: merchantId ?? undefined, // can be null if merchantId is null
          // Optional: set user_name from message profile if available (not in basic message)
          // context: {} // default is already set in DB
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating conversation:', insertError);
        throw insertError;
      }

      if (newConversation) {
        conversationId = newConversation.id;
      }
    }

    // 3. Save the message
    const content = message.type === 'text' ? message.text?.body : JSON.stringify(message);
    const messageType = message.type;

    // ignoreDuplicates: true silently skips if whatsapp_message_id already exists
    // (requires UNIQUE constraint on messages.whatsapp_message_id — migration 0005)
    const { error: messageError } = await supabase
      .from('messages')
      .upsert(
        {
          conversation_id: conversationId,
          content,
          direction: 'incoming',
          message_type: messageType,
          whatsapp_message_id: message.id,
          metadata: { raw: message, timestamp: message.timestamp },
        },
        { onConflict: 'whatsapp_message_id', ignoreDuplicates: true }
      );

    if (messageError) {
      console.error('Error saving message:', messageError);
      throw messageError;
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to save incoming message:', error);
    throw error;
  }
}