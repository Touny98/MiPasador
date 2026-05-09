'use server';

import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function togglePasadorActivo(id: number, currentActivo: boolean) {
  try {
    const { error } = await supabaseAdmin
      .from('pasadores')
      .update({ activo: !currentActivo })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/admin/pasadores');
    return { success: true };
  } catch (error) {
    console.error('Error in togglePasadorActivo:', error);
    return { success: false, error: 'No se pudo cambiar el estado.' };
  }
}

export async function deletePasador(id: number) {
  try {
    const { error } = await supabaseAdmin
      .from('pasadores')
      .delete()
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/admin/pasadores');
    return { success: true };
  } catch (error) {
    console.error('Error in deletePasador:', error);
    return { success: false, error: 'No se pudo eliminar el pasador.' };
  }
}

export async function fetchPasadores() {
  const { data, error } = await supabaseAdmin
    .from('pasadores')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pasadores:', error);
    return [];
  }
  return data;
}
