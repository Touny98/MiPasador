import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('queries')
      .select(`
        id,
        search_term,
        results_count,
        created_at,
        conversations (
          user_whatsapp_id,
          user_name
        )
      `)
      .eq('resolved_bool', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching gaps:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Error in gaps data route:', error);
    return NextResponse.json({ error: 'Failed to fetch gaps' }, { status: 500 });
  }
}
