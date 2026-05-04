import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select(`
        id,
        quantity,
        status,
        notes,
        created_at,
        updated_at,
        conversations (
          user_whatsapp_id,
          user_name
        ),
        products (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Error in reservations data route:', error);
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
  }
}
