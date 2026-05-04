import { supabaseAdmin } from '@/lib/utils/supabase';

export async function getLatestRate(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('exchange_rates')
    .select('rate')
    .eq('base_currency', 'ARS')
    .eq('target_currency', 'BOB')
    .order('timestamp', { ascending: false })
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('No exchange rate found for ARS/BOB');

  return data[0].rate;
}

export async function bobToArs(bob: number): Promise<number> {
  return bob * (await getLatestRate());
}

export async function arsToBob(ars: number): Promise<number> {
  return ars / (await getLatestRate());
}
