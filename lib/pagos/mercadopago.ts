import { supabaseAdmin } from '@/lib/utils/supabase/admin';

const MP_API = 'https://api.mercadopago.com';

export async function generarLinkPago(opts: {
  compraId: string;
  codigo: string;
  titulo: string;
  precioArs: number;
}): Promise<{ link: string; mpPaymentId: string | null }> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return { link: `https://mipasador.vercel.app/pagar/${opts.codigo}`, mpPaymentId: null };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mipasador.vercel.app';
  const body = {
    items: [{ title: opts.titulo, quantity: 1, unit_price: opts.precioArs, currency_id: 'ARS' }],
    external_reference: opts.compraId,
    back_urls: {
      success: `${baseUrl}/pagar/${opts.codigo}/gracias`,
      failure: `${baseUrl}/pagar/${opts.codigo}`,
      pending: `${baseUrl}/pagar/${opts.codigo}`,
    },
    auto_return: 'approved',
    notification_url: `${baseUrl}/api/mp/webhook`,
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('[MP] generarLinkPago error:', err);
    return { link: `https://mipasador.vercel.app/pagar/${opts.codigo}`, mpPaymentId: null };
  }

  const data = await res.json() as { init_point: string; id: string };
  return { link: data.init_point, mpPaymentId: data.id };
}

export async function verificarPago(
  mpPaymentId: string
): Promise<'approved' | 'pending' | 'rejected' | 'unknown'> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return 'unknown';

  const res = await fetch(`${MP_API}/v1/payments/${mpPaymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return 'unknown';

  const data = await res.json() as { status: string };
  const s = data.status;
  if (s === 'approved') return 'approved';
  if (s === 'pending' || s === 'in_process' || s === 'authorized') return 'pending';
  if (s === 'rejected' || s === 'cancelled' || s === 'refunded' || s === 'charged_back') return 'rejected';
  return 'unknown';
}

export async function registrarEvento(
  compraId: string,
  status: string,
  rawPayload: unknown
): Promise<void> {
  await supabaseAdmin.from('payment_events').insert({
    compra_id: compraId,
    status,
    raw_payload: rawPayload as never,
  }).then(({ error }) => {
    if (error) console.error('[MP] registrarEvento error:', error.message);
  });
}
