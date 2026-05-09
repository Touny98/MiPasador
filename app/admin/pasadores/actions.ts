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

export async function fetchViajesAdmin(filters: { estado?: string; fechaDesde?: string; fechaHasta?: string }) {
  let query = supabaseAdmin.from('viajes').select('*, pasadores(nombre_completo), ratings(score)').order('created_at', { ascending: false });

  if (filters.estado) {
    query = query.eq('estado', filters.estado);
  }
  if (filters.fechaDesde) {
    query = query.gte('created_at', `${filters.fechaDesde}T00:00:00Z`);
  }
  if (filters.fechaHasta) {
    query = query.lte('created_at', `${filters.fechaHasta}T23:59:59Z`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching viajes:', error);
    return [];
  }
  return data;
}

export async function deletePostulacion(id: string) {
  try {
    const { error } = await supabaseAdmin.from('postulaciones_comercio').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/pasadores');
    return { success: true };
  } catch (error) {
    console.error('Error deleting postulacion:', error);
    return { success: false, error: 'No se pudo eliminar la postulacion' };
  }
}
