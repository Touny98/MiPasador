import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterPasador = searchParams.get('filterPasador') || '';

    let query = supabaseAdmin
      .from('comisiones')
      .select('*, pasadores(nombre_completo, dni)')
      .order('fecha', { ascending: false });

    if (filterPasador) {
      query = query.or(`pasadores.nombre_completo.ilike.%${filterPasador}%,pasadores.dni.ilike.%${filterPasador}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching comisiones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comisiones' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, pagado } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('comisiones')
      .update({ pagado })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Comisión updated successfully' });
  } catch (error: any) {
    console.error('Error updating comision:', error);
    return NextResponse.json(
      { error: 'Failed to update comision' },
      { status: 500 }
    );
  }
}
