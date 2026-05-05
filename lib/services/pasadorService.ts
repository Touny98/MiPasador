import { supabaseAdmin } from '@/lib/utils/supabase';
import type { Json } from '@/lib/database.types';

// ---------------------------------------------------------------------------
// Row types (inferred from database.types.ts)
// ---------------------------------------------------------------------------
type PasadorRow = {
  id: number;
  wa_user_id: string;
  nombre_completo: string | null;
  dni: string | null;
  estado: string | null;
  activo: boolean | null;
  reputacion_promedio: number | null;
  cantidad_viajes_completados: number | null;
  ultima_conexion: string | null;
};

type ViajeRow = {
  id: number;
  usuario_wa_id: string | null;
  pasador_id: number | null;
  peso: number | null;
  descripcion: string | null;
  direccion_origen: string | null;
  ruta: string | null;
  precio_ars: number | null;
  comision_ars: number | null;
  estado: string | null;
  created_at: string | null;
  completado_at: string | null;
  rating: number | null;
};

// ---------------------------------------------------------------------------
// Pasador queries
// ---------------------------------------------------------------------------

export async function getPasadorByWaId(wa_user_id: string): Promise<PasadorRow | null> {
  const { data, error } = await supabaseAdmin
    .from('pasadores')
    .select('*')
    .eq('wa_user_id', wa_user_id)
    .single();
  if (error) return null;
  return data as PasadorRow;
}

export async function getActivePasadores(): Promise<PasadorRow[]> {
  const { data, error } = await supabaseAdmin
    .from('pasadores')
    .select('*')
    .eq('estado', 'disponible')
    .eq('activo', true)
    .order('reputacion_promedio', { ascending: false });
  if (error) {
    console.error('getActivePasadores error:', error);
    return [];
  }
  return (data ?? []) as PasadorRow[];
}

export async function assignPasador(viajeId: number, pasadorId: number): Promise<void> {
  const { error: viajeErr } = await supabaseAdmin
    .from('viajes')
    .update({ pasador_id: pasadorId, estado: 'pendiente' })
    .eq('id', viajeId);
  if (viajeErr) {
    console.error('assignPasador viaje update error:', viajeErr);
    throw viajeErr;
  }
  const { error: pasadorErr } = await supabaseAdmin
    .from('pasadores')
    .update({ estado: 'ocupado' })
    .eq('id', pasadorId);
  if (pasadorErr) {
    console.error('assignPasador pasador update error:', pasadorErr);
    throw pasadorErr;
  }
}

// ---------------------------------------------------------------------------
// Tarifa queries
// ---------------------------------------------------------------------------

export async function getPrecio(ruta: string, peso: number): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from('tarifas_pasador')
    .select('precio_ars')
    .eq('ruta', ruta)
    .eq('activa', true)
    .lte('peso_min', peso)
    .gte('peso_max', peso)
    .single();
  if (error || !data) return null;
  return data.precio_ars ?? null;
}

// ---------------------------------------------------------------------------
// Viaje queries
// ---------------------------------------------------------------------------

export async function getViajeActivo(pasadorId: number): Promise<ViajeRow | null> {
  const { data, error } = await supabaseAdmin
    .from('viajes')
    .select('*')
    .eq('pasador_id', pasadorId)
    .in('estado', ['pendiente', 'aceptado'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data as ViajeRow;
}

export async function updateViajeEstado(viajeId: number, estado: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('viajes')
    .update({ estado })
    .eq('id', viajeId);
  if (error) {
    console.error('updateViajeEstado error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Pasador state queries
// ---------------------------------------------------------------------------

export async function updatePasadorEstado(pasadorId: number, estado: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('pasadores')
    .update({ estado, ultima_conexion: new Date().toISOString() })
    .eq('id', pasadorId);
  if (error) {
    console.error('updatePasadorEstado error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Comision helpers
// ---------------------------------------------------------------------------

export function calcularComision(totalPrecio: number): number {
  return totalPrecio * 0.10;
}

export async function updateReputacionPasador(pasadorId: number): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('ratings')
    .select('puntuacion')
    .eq('pasador_id', pasadorId);
  if (error) {
    console.error('updateReputacionPasador fetch ratings error:', error);
    return;
  }
  const scores = (data ?? [])
    .map((r) => r.puntuacion)
    .filter((s): s is number => s !== null);
  if (scores.length === 0) return;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const { error: updErr } = await supabaseAdmin
    .from('pasadores')
    .update({ reputacion_promedio: Math.round(avg * 100) / 100 })
    .eq('id', pasadorId);
  if (updErr) {
    console.error('updateReputacionPasador update error:', updErr);
  }
}

// ---------------------------------------------------------------------------
// Conversation context
// ---------------------------------------------------------------------------

export async function getOrCreateConversationContext(conversationId: string): Promise<Json | null> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('context')
    .eq('id', conversationId)
    .single();
  if (error) {
    console.error('getOrCreateConversationContext error:', error);
    return null;
  }
  return data?.context ?? null;
}

export async function setConversationContext(conversationId: string, context: Json): Promise<void> {
  const { error } = await supabaseAdmin
    .from('conversations')
    .update({ context })
    .eq('id', conversationId);
  if (error) {
    console.error('setConversationContext error:', error);
    throw error;
  }
}
