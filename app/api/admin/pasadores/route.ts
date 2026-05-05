import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('pasadores')
      .select('*')
      .order('nombre_completo');

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching pasadores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pasadores' },
      { status: 500 }
    );
  }
}