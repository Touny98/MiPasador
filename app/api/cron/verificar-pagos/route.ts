import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { MetaCloudProvider } from '@/lib/messaging/meta-cloud';
import { verificarPago, registrarEvento } from '@/lib/pagos/mercadopago';
import { liberarStock } from '@/lib/services/compraService';

const metaProvider = new MetaCloudProvider(
  process.env.META_ACCESS_TOKEN!,
  process.env.META_PHONE_NUMBER_ID!
);

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: compras, error } = await supabaseAdmin
    .from('compras')
    .select('id, mp_payment_id, wa_user_id, producto_id, codigo_seguridad')
    .eq('estado', 'pendiente_pago')
    .not('mp_payment_id', 'is', null)
    .limit(50);

  if (error) {
    console.error('[verificar-pagos] fetch error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let approved = 0;
  let checked = 0;

  for (const compra of compras ?? []) {
    if (!compra.mp_payment_id) continue;
    checked++;

    const status = await verificarPago(compra.mp_payment_id).catch(() => 'unknown' as const);

    if (status === 'approved') {
      await supabaseAdmin
        .from('compras')
        .update({ estado: 'pagado', updated_at: new Date().toISOString() })
        .eq('id', compra.id)
        .eq('estado', 'pendiente_pago');

      if (compra.producto_id) {
        const { data: p } = await supabaseAdmin.from('products').select('total_reservations').eq('id', compra.producto_id).single();
        await supabaseAdmin.from('products').update({ total_reservations: ((p?.total_reservations as number | null) ?? 0) + 1 }).eq('id', compra.producto_id);
        await liberarStock(compra.producto_id, true).catch(() => {});
      }

      await registrarEvento(compra.id, 'approved', { source: 'cron' }).catch(() => {});

      if (compra.wa_user_id) {
        await metaProvider.sendInteractiveButtons(
          compra.wa_user_id,
          `✅ *Pago confirmado* #${compra.codigo_seguridad}\n¿Querés que un pasador te lo lleve? 🚶`,
          [
            { id: `pasador_si_${compra.id}`, title: 'Sí, con pasador' },
            { id: `pasador_no_${compra.id}`, title: 'No, lo retiro' },
          ]
        ).catch(() => {});
      }

      approved++;
    }
  }

  return NextResponse.json({ checked, approved });
}
