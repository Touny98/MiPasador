import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { supabase } from '@/lib/utils/supabase/client';

/**
 * Update the reputation of a pasador based on their ratings.
 * @param pasadorId Pasador ID
 */
export async function actualizarReputacion(pasadorId: number): Promise<void> {
  // Calculate the average rating from the ratings table for this pasador
  const { data, error, count } = await supabaseAdmin
    .from('ratings')
    .select('puntuacion')
    .eq('pasador_id', pasadorId)
    .not('puntuacion', 'is', null);

  if (error) {
    console.error('Error fetching ratings for pasador:', error);
    return;
  }

  if (!data || data.length === 0) {
    // No ratings, set reputation to null or a default? We'll set to null.
    const { error: updateError } = await supabaseAdmin
      .from('pasadores')
      .update({ reputacion_promedio: null })
      .eq('id', pasadorId);

    if (updateError) {
      console.error('Error updating pasador reputation to null:', updateError);
    }
    return;
  }

  // Calculate average
  const sum = data.reduce((acc, rating) => acc + (rating.puntuacion || 0), 0);
  const promedio = sum / data.length;

  // Update the pasador's reputation
  const { error: updateError } = await supabaseAdmin
    .from('pasadores')
    .update({ reputacion_promedio: promedio })
    .eq('id', pasadorId);

  if (updateError) {
    console.error('Error updating pasador reputation:', updateError);
  }
}

/**
 * Get the reputation of a pasador.
 * @param pasadorId Pasador ID
 * @returns Reputation average or null if no ratings
 */
export async function obtenerReputacion(pasadorId: number): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from('pasadores')
    .select('reputacion_promedio')
    .eq('id', pasadorId)
    .single();

  if (error) {
    throw error;
  }

  return data?.reputacion_promedio ?? null;
}

/**
 * Update reputation for all pasadores (could be called periodically).
 */
export async function actualizarTodasLasReputaciones(): Promise<void> {
  // Get all pasador IDs
  const { data: pasadores, error } = await supabaseAdmin
    .from('pasadores')
    .select('id');

  if (error) {
    throw error;
  }

  // Update reputation for each pasador
  for (const pasador of pasadores) {
    await actualizarReputacion(pasador.id);
    // We could add a small delay to avoid overwhelming the database, but for simplicity we'll do it sequentially.
    // In a real system, we might do this in batches or via a cron job.
  }
}