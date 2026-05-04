import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase';

export async function GET() {
  try {
    // ARS/USD: official rate from dolarapi.com
    const arsResponse = await fetch('https://dolarapi.com/v1/dolares');
    if (!arsResponse.ok) throw new Error(`dolarapi.com ${arsResponse.status}`);
    const arsData = await arsResponse.json();
    const usdRate: number = arsData.find((d: any) => d.casa === 'oficial')?.venta;
    if (!usdRate) throw new Error('Official USD rate not found in dolarapi.com response');

    // BOB/USD: from exchangerate.host (1 USD = X BOB)
    const bobResponse = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=BOB');
    if (!bobResponse.ok) throw new Error(`exchangerate.host ${bobResponse.status}`);
    const bobData = await bobResponse.json();
    const bobRate: number = bobData.rates?.BOB;
    if (!bobRate) throw new Error('BOB rate not found in exchangerate.host response');

    // 1 BOB = (1/bobRate) USD = (usdRate/bobRate) ARS
    const arsPerBob = usdRate / bobRate;
    const timestamp = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('exchange_rates')
      .upsert(
        { base_currency: 'ARS', target_currency: 'BOB', rate: arsPerBob, timestamp },
        { onConflict: 'base_currency,target_currency' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, arsPerBob });
  } catch (err) {
    console.error('Error refreshing rates:', err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
