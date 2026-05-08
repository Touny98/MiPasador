import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { registrarEvento } from '@/lib/pagos/mercadopago';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomChar(set: string) {
  return set[Math.floor(Math.random() * set.length)];
}

export function generarCodigoSeguridad(): string {
  return (
    'MP-' +
    randomChar(ALPHA) +
    randomChar(ALPHA) +
    randomChar(CHARS) +
    randomChar(CHARS) +
    randomChar(CHARS) +
    randomChar(CHARS)
  );
}

export async function verificarStock(productoId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('stock_actual')
    .eq('id', productoId)
    .single();
  return (data?.stock_actual as number | null) ?? 0;
}

// Atomic stock decrement using optimistic concurrency.
// Returns true only if exactly one row was updated.
export async function reducirStock(productoId: string): Promise<boolean> {
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('products')
    .select('stock_actual, stock_reservado')
    .eq('id', productoId)
    .single();

  if (fetchErr || !current || (current.stock_actual ?? 0) <= 0) return false;

  const { data: updated } = await supabaseAdmin
    .from('products')
    .update({
      stock_actual: (current.stock_actual as number) - 1,
      stock_reservado: ((current.stock_reservado as number | null) ?? 0) + 1,
    })
    .eq('id', productoId)
    .eq('stock_actual', current.stock_actual as number)
    .select('id');

  return (updated?.length ?? 0) > 0;
}

export async function liberarStock(productoId: string, vendido: boolean): Promise<void> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('stock_actual, stock_reservado')
    .eq('id', productoId)
    .single();

  if (!data) return;

  const stockActual = (data.stock_actual as number | null) ?? 0;
  const stockReservado = (data.stock_reservado as number | null) ?? 0;

  if (vendido) {
    await supabaseAdmin
      .from('products')
      .update({ stock_reservado: Math.max(0, stockReservado - 1) })
      .eq('id', productoId);
  } else {
    await supabaseAdmin
      .from('products')
      .update({ stock_actual: stockActual + 1, stock_reservado: Math.max(0, stockReservado - 1) })
      .eq('id', productoId);
  }
}

export interface CrearCompraOpts {
  productoId: string;
  conversationId: string;
  waUserId: string;
  codigoSeguridad: string;
  precioArs: number;
  paymentLink: string;
  mpPaymentId: string | null;
}

export interface Compra {
  id: string;
  codigo_seguridad: string;
  estado: string | null;
  precio_ars: number;
  payment_link: string | null;
  mp_payment_id: string | null;
  producto_id: string | null;
  wa_user_id: string;
}

export async function crearCompra(opts: CrearCompraOpts): Promise<Compra> {
  const { data, error } = await supabaseAdmin
    .from('compras')
    .insert({
      producto_id: opts.productoId,
      conversation_id: opts.conversationId,
      wa_user_id: opts.waUserId,
      codigo_seguridad: opts.codigoSeguridad,
      precio_ars: opts.precioArs,
      payment_link: opts.paymentLink,
      mp_payment_id: opts.mpPaymentId,
      estado: 'pendiente_pago',
    })
    .select('id, codigo_seguridad, estado, precio_ars, payment_link, mp_payment_id, producto_id, wa_user_id')
    .single();

  if (error || !data) throw new Error(`crearCompra failed: ${error?.message}`);

  await registrarEvento(data.id, 'created', {}).catch(() => {});

  return data as Compra;
}

export async function cancelarCompra(compraId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('compras')
    .select('producto_id, estado')
    .eq('id', compraId)
    .single();

  await supabaseAdmin
    .from('compras')
    .update({ estado: 'cancelado', updated_at: new Date().toISOString() })
    .eq('id', compraId);

  if (data?.producto_id && data.estado === 'pendiente_pago') {
    await liberarStock(data.producto_id, false);
  }

  await registrarEvento(compraId, 'cancelled', {}).catch(() => {});
}
