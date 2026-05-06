import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';

export async function GET() {
  try {
    // 1. Get general statistics: distribution of stars
    const { data: starDistribution, error: starError } = await supabaseAdmin
      .from('viajes')
      .select('estrellas')
      .not('estrellas', 'is', null);

    if (starError) throw starError;

    const distribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    } as Record<number, number>;

    starDistribution?.forEach((v: any) => {
      if (v.estrellas >= 1 && v.estrellas <= 5) {
        distribution[v.estrellas]++;
      }
    });

    // 2. Get pasadores with low ratings (e.g. average < 3.5)
    const { data: lowRated, error: lowError } = await supabaseAdmin
      .from('pasadores')
      .select('nombre_completo, dni, reputacion_promedio')
      .lt('reputacion_promedio', 3.5)
      .order('reputacion_promedio', { ascending: true });

    if (lowError) throw lowError;

    return NextResponse.json({
      distribution,
      lowRated
    });
  } catch (error: any) {
    console.error('Error fetching reputation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reputation data' },
      { status: 500 }
    );
  }
}
