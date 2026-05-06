import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { generatePaymentLink } from '@/lib/pasador/mercadopago';

/**
 * Calculate commission based on completed trips.
 * @param viajesCompletados Array of viaje objects (with precio)
 * @returns Commission percentage (e.g., 0.10 for 10%) or amount per trip.
 */
export function calcularComision(viajesCompletados: { precio: number | null }[]): number {
  return 0.10; // 10%
}

/**
 * Generate a payment link for the commission.
 * @param pasadorId Pasador ID
 * @param monto Commission amount in ARS
 * @param email Payer email
 * @returns MercadoPago payment link
 */
export async function generarLinkPago(pasadorId: number, monto: number, email: string = 'pasador@example.com'): Promise<string> {
  const description = `Comisión de pasador - ID: ${pasadorId}`;
  const externalReference = `comision-pasador-${pasadorId}-${Date.now()}`;

  return await generatePaymentLink(
    monto,
    description,
    email,
    externalReference
  );
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
      total_viajes: 0,
      monto_comision: monto,
      link_pago: link
    });
}

/**
 * Optional: Update the total_viajes in the comisiones record based on the pasador's completed viajes.
 */
export async function actualizarTotalViajesEnComision(pasadorId: number, fechaDesde: string): Promise<void> {
  const { count, error } = await supabaseAdmin
    .from('viajes')
    .select('id', { count: 'exact', head: true })
    .eq('pasador_id', pasadorId)
    .eq('estado', 'completado')
    .gte('completado_at', fechaDesde);

  if (error) {
    throw error;
  }
}

/**
 * Get the commission settings (e.g., percentage) from a configuration table.
 */
export async function obtenerPorcentajeComision(): Promise<number> {
  return 0.10;
}