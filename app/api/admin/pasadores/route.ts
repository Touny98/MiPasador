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

export async function POST(request: Request) {
  try {
    const { id, action } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    let updateData: any = {};

    if (action === 'toggle') {
      // First get the current state to toggle it
      const { data: currentData, error: fetchError } = await supabaseAdmin
        .from('pasadores')
        .select('activo')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      updateData.activo = !currentData.activo;
    } else if (action === 'suspend') {
      updateData.activo = false;
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "toggle" or "suspend"' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('pasadores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error processing pasadores action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}