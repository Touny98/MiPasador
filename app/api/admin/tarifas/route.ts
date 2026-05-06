import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('tarifas_pasador')
      .select('*')
      .order('ruta', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching tarifas:', error);
    return NextResponse.json({ error: 'Failed to fetch tarifas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, ruta, peso_min, peso_max, precio_ars, activa } = body;

    if (id) {
      // Update existing
      const { error } = await supabaseAdmin
        .from('tarifas_pasador')
        .update({ ruta, peso_min, peso_max, precio_ars, activa })
        .eq('id', id);
      if (error) throw error;
    } else {
      // Create new
      const { error } = await supabaseAdmin
        .from('tarifas_pasador')
        .insert({ ruta, peso_min, peso_max, precio_ars, activa });
      if (error) throw error;
    }

    return NextResponse.json({ message: 'Tarifa saved successfully' });
  } catch (error: any) {
    console.error('Error saving tarifa:', error);
    return NextResponse.json({ error: 'Failed to save tarifa' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('tarifas_pasador')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Tarifa deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting tarifa:', error);
    return NextResponse.json({ error: 'Failed to delete tarifa' }, { status: 500 });
  }
}
