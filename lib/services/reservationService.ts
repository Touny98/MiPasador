import { supabaseAdmin as supabase } from '@/lib/utils/supabase';

export interface ReservationData {
  conversationId: string;
  productId: string;
  quantity?: number;
  status?: string;
  notes?: string | null;
}

/**
 * Create a new reservation
 * @param data Reservation data
 */
export async function createReservation(data: ReservationData) {
  const {
    conversationId,
    productId,
    quantity = 1,
    status = 'pending',
    notes = null,
  } = data;

  const { error } = await supabase
    .from('reservations')
    .insert({
      conversation_id: conversationId,
      product_id: productId,
      quantity,
      status,
      notes,
    });

  if (error) {
    console.error('Error creating reservation:', error);
    throw error;
  }
}