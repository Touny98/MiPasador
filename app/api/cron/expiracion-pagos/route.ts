import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { MetaCloudProvider } from '@/lib/messaging/meta-cloud';
import { liberarStock } from '@/lib/services/compraService';
import { registrarEvento } from '@/lib/pagos/mercadopago';

const metaProvider = new MetaCloudProvider(
  process.env.META_ACCESS_TOKEN!,
  process.env.META_PHONE_NUMBER_ID!
);

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: compras, error } = await supabaseAdmin
    .from('compras')
    .select('id, wa_user_id, producto_id, codigo_seguridad')
    .eq('estado', 'pendiente_pago')
    .lt('created_at', thirtyMinutesAgo)
    .limit(50);

  if (error) {
    console.error('[expiracion-pagos] fetch error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let expired = 0;
  for (const compra of compras ?? []) {
    await supabaseAdmin
      .from('compras')
      .update({ estado: 'expirado', updated_at: new Date().toISOString() })
      .eq('id', compra.id)
      .eq('estado', 'pendiente_pago');

    if (compra.producto_id) {
      await liberarStock(compra.producto_id, false).catch(() => {});
    }

    await registrarEvento(compra.id, 'expired', {}).catch(() => {});

    if (compra.wa_user_id) {
      await metaProvider.sendMessage(
        compra.wa_user_id,
        `⏰ Tu orden *#${compra.codigo_seguridad}* expiró por falta de pago.\nSi querés comprar de nuevo, escribí "hola" para ver el menú.`
      ).catch(() => {});
    }

    expired++;
  }

  return NextResponse.json({ expired });
}
