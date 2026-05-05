/**
 * MercadoPago simulation layer.
 * Real integration would use the MercadoPago SDK with process.env.MERCADO_PAGO_ACCESS_TOKEN.
 * All actual commission DB writes are handled by lib/pasador/comisiones.ts.
 */

export async function generatePaymentLink(
  amount: number,
  description: string,
  payerEmail: string,
  externalReference: string
): Promise<string> {
  /*
  Real implementation example:
  import { MercadoPagoConfig, Preference } from 'mercadopago';
  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! });
  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: [{ title: description, quantity: 1, unit_price: amount }],
      payer: { email: payerEmail },
      external_reference: externalReference,
    },
  });
  return result.init_point!;
  */

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/pago/simulado?amount=${amount}&desc=${encodeURIComponent(description)}&email=${payerEmail}&ref=${externalReference}&ts=${Date.now()}`;
}

export async function getPaymentStatus(paymentId: string): Promise<'pending' | 'paid' | 'failed'> {
  // Simulated: always pending in dev
  console.log(`[MercadoPago Simulado] Checking payment status for: ${paymentId}`);
  return 'pending';
}
