import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { supabase } from '@/lib/utils/supabase/client';

/**
 * Calculate commission based on completed trips.
 * @param viajesCompletados Array of viaje objects (with precio)
 * @returns Commission percentage (e.g., 0.10 for 10%) or amount per trip.
 *          We'll return a percentage for simplicity.
 */
export function calcularComision(viajesCompletados: { precio: number | null }[]): number {
  // We'll use a fixed percentage of 10% of the total facturado.
  // Alternatively, we could have a tiered system, but the prompt says "porcentaje fijo (ej: 10%) o por viaje."
  // We'll implement a fixed percentage.
  return 0.10; // 10%
}

/**
 * Generate a payment link for the commission.
 * @param pasadorId Pasador ID
 * @param monto Commission amount in ARS
 * @returns Simulated payment link (or real if integrated with MercadoPago)
 */
export async function generarLinkPago(pasadorId: number, monto: number): Promise<string> {
  // In a real implementation, we would call the MercadoPago API to generate a payment link.
  // For now, we'll return a simulated link.
  const randomId = Math.random().toString(36).substring(2, 15);
  return `https://www.mercadopago.com.ar/payments/link/${pasadorId}/${monto}/${randomId}`;
}

/**
 * Register a commission in the comisiones table.
 * @param pasadorId Pasador ID
 * @param fecha Date of the commission (ISO string)
 * @param total Total amount factured for the period
 * @param monto Commission amount
 * @param link Payment link
 */
export async function registrarComision(
  pasadorId: number,
  fecha: string,
  total: number,
  monto: number,
  link: string
): Promise<void> {
  await supabaseAdmin
    .from('comisiones')
    .insert({
      pasador_id: pasadorId,
      fecha,
      total_viajes: 0, // We'll leave it as 0; we can update via a trigger or compute later.
      monto_comision: monto,
      link_pago: link
    });
}

/**
 * Optional: Update the total_viajes in the comisiones record based on the pasador's completed viajes.
 * This could be called periodically or via a trigger.
 */
export async function actualizarTotalViajesEnComision(pasadorId: number, fechaDesde: string): Promise<void> {
  // Get the count of completed viajes for the pasador since fechaDesde
  const { count, error } = await supabaseAdmin
    .from('viajes')
    .select('id', { count: 'exact', head: true })
    .eq('pasador_id', pasadorId)
    .eq('estado', 'completado')
    .gte('completado_at', fechaDesde);

  if (error) {
    throw error;
  }

  // Update the most recent comisiones record for this pasador (assuming one per period)
  // We'll update the comisiones record with the same fecha? We don't have a period.
  // We'll skip for now.
  // In a real system, we might have a comisiones record per day or per week.
  // We'll leave this as a placeholder.
}

/**
 * Get the commission settings (e.g., percentage) from a configuration table.
 * We don't have a configuration table, so we'll return the fixed percentage.
 */
export async function obtenerPorcentajeComision(): Promise<number> {
  return 0.10;
}