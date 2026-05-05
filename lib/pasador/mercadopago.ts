import type { Json } from '@/lib/database.types';

// Simulate MercadoPago payment link generation
// In a real implementation, this would integrate with the actual MercadoPago SDK

export async function generatePaymentLink(
  amount: number,
  description: string,
  payerEmail: string,
  externalReference: string
): Promise<string> {
  // In a real implementation, you would use the MercadoPago SDK
  // For now, we'll simulate a payment link

  // Example of what a real implementation might look like:
  /*
  import { MercadoPagoConfig, Preference } from 'mercadopago';

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
    options: { timeout: 5000 }
  });

  const preference = new Preference(client);

  const result = await preference.create({
    body: {
      items: [
        {
          title: description,
          quantity: 1,
          unit_price: amount,
        },
      ],
      payer: {
        email: payerEmail,
      },
      external_reference: externalReference,
      back_urls: {
        success: process.env.NEXT_PUBLIC_APP_URL + '/pago/success',
        failure: process.env.NEXT_PUBLIC_APP_URL + '/pago/failure',
        pending: process.env.NEXT_PUBLIC_APP_URL + '/pago/pending',
      },
      auto_return: 'approved',
    },
  });

  return result.init_point;
  */

  // Simulation for development
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const timestamp = Date.now();
  const simulatedLink = `${baseUrl}/pago/simulado?amount=${amount}&desc=${encodeURIComponent(description)}&email=${payerEmail}&ref=${externalReference}&ts=${timestamp}`;

  console.log(`[MercadoPago Simulado] Link de pago generado: ${simulatedLink}`);
  return simulatedLink;
}

// Record a commission payment
export async function registerCommissionPayment(
  pasadorId: number,
  viajeId: number,
  amount: number,
  paymentLink: string,
  status: 'pending' | 'paid' | 'failed' = 'pending'
): Promise<Json> {
  const { data, error } = await supabaseAdmin
    .from('comisiones_pasador')
    .insert({
      pasador_id: pasadorId,
      viaje_id: viajeId,
      monto: amount,
      enlace_pago: paymentLink,
      estado: status,
      pagado_at: status === 'paid' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error registering commission payment:', error);
    throw error;
  }

  return data;
}

// Update commission payment status
export async function updateCommissionPaymentStatus(
  commissionId: number,
  status: 'paid' | 'failed',
  paymentData?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('comisiones_pasador')
    .update({
      estado: status,
      pagado_at: status === 'paid' ? new Date().toISOString() : null,
      datos_pago: paymentData ? JSON.stringify(paymentData) : null,
    })
    .eq('id', commissionId);

  if (error) {
    console.error('Error updating commission payment status:', error);
    throw error;
  }
}

// Get pending commissions for a pasador
export async function getPendingCommissions(pasadorId: number): Promise<Json[]> {
  const { data, error } = await supabaseAdmin
    .from('comisiones_pasador')
    .select(`
      *,
      viajes!viajes_id (
        id,
        precio_ars,
        creado_at
      )
    `)
    .eq('pasador_id', pasadorId)
    .eq('estado', 'pending')
    .order('creado_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending commissions:', error);
    throw error;
  }

  return data || [];
}