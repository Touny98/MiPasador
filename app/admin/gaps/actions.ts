'use server';

import { supabaseAdmin } from '@/lib/utils/supabase/admin';

export async function resolveGap(id: string) {
  const { error } = await supabaseAdmin
    .from('queries')
    .update({ resolved_bool: true })
    .eq('id', id);

  if (error) {
    console.error('Error resolving gap:', error);
    throw error;
  }
}