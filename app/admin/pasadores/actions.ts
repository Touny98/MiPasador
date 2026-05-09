'use server';

import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function createPasador(formData: FormData) {
  const nombre_completo = formData.get('nombre_completo') as string;
  const dni = formData.get('dni') as string;
  const wa_user_id = formData.get('wa_user_id') as string;

  try {
    const { error } = await supabaseAdmin
      .from('pasadores')
      .insert([{ 
        nombre_completo, 
        dni, 
        wa_user_id,
        activo: false,
        estado: 'activo',
        cantidad_viajes_completados: 0
      }]);

    if (error) throw error;

    // Add pasador role
    await supabaseAdmin.from('user_roles').upsert({ wa_user_id, role: 'pasador' });

    revalidatePath('/admin/pasadores');
    return { success: true };
  } catch (error) {
    console.error('Error creating pasador:', error);
    return { success: false, error: 'No se pudo crear el pasador. Revisa que el WhatsApp no esté duplicado.' };
  }
}

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
    // First, get the wa_user_id to remove the role later
    const { data: pasador } = await supabaseAdmin
      .from('pasadores')
      .select('wa_user_id')
      .eq('id', id)
      .single();

    // 1. Delete associated data that might block deletion (FK constraints)
    await supabaseAdmin.from('comisiones').delete().eq('pasador_id', id);
    await supabaseAdmin.from('sesiones_pasador').delete().eq('pasador_id', id);
    await supabaseAdmin.from('ratings').delete().eq('pasador_id', id);
    
    // For viajes, we might want to keep the history but remove the link, 
    // or just delete them if the user wants a full wipe. 
    // Given the request is "Delete", we'll clear the link or delete. 
    // Let's set pasador_id to null in viajes if possible, or delete if constrained.
    await supabaseAdmin.from('viajes').update({ pasador_id: null }).eq('pasador_id', id);

    // 2. Delete the pasador
    const { error } = await supabaseAdmin
      .from('pasadores')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // 3. Remove the pasador role if it exists
    if (pasador?.wa_user_id) {
      await supabaseAdmin.from('user_roles').delete().eq('wa_user_id', pasador.wa_user_id);
    }

    revalidatePath('/admin/pasadores');
    return { success: true };
  } catch (error) {
    console.error('Error in deletePasador:', error);
    return { success: false, error: 'No se pudo eliminar el pasador por integridad de datos.' };
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
    const { error } = await supabaseAdmin.from('postulaciones').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/pasadores');
    return { success: true };
  } catch (error) {
    console.error('Error deleting postulacion:', error);
    return { success: false, error: 'No se pudo eliminar la postulacion' };
  }
}
