import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { MetaCloudProvider } from '@/lib/messaging/meta-cloud';

const meta = new MetaCloudProvider(
  process.env.META_ACCESS_TOKEN!,
  process.env.META_PHONE_NUMBER_ID!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'todos'; // todos, pendiente, lista_para_revision, requiere_correccion, aceptada, denegada

    let query = supabaseAdmin.from('postulaciones').select('*');

    if (filter !== 'todos') {
      query = query.eq('estado', filter);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching postulaciones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch postulaciones' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    if (action === 'aceptar') {
      // First, get the postulacion
      const { data: postulacion, error: fetchError } = await supabaseAdmin
        .from('postulaciones')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !postulacion) {
        return NextResponse.json(
          { error: 'Error al obtener la postulación' },
          { status: 400 }
        );
      }

      // Check if a pasador with this wa_user_id already exists
      const { data: existingPasador } = await supabaseAdmin
        .from('pasadores')
        .select('id')
        .eq('wa_user_id', postulacion.wa_user_id ?? '')
        .single();

      if (existingPasador) {
        // Update postulacion status only (don't create duplicate pasador)
        await supabaseAdmin
          .from('postulaciones')
          .update({ estado: 'aceptada' })
          .eq('id', id);
      } else {
        // Create new pasador
        const { error: createError } = await supabaseAdmin
          .from('pasadores')
          .insert({
            nombre_completo: postulacion.nombre_completo,
            dni: postulacion.dni,
            wa_user_id: postulacion.wa_user_id ?? '',
            activo: false,
            estado: 'inactivo',
            reputacion_promedio: null,
            cantidad_viajes_completados: 0,
          });

        if (createError) {
          return NextResponse.json(
            { error: 'Error al crear el pasador' },
            { status: 400 }
          );
        }

        // Update postulacion status
        await supabaseAdmin
          .from('postulaciones')
          .update({ estado: 'aceptada' })
          .eq('id', id);
      }
    } else if (action === 'denegar') {
      await supabaseAdmin
        .from('postulaciones')
        .update({ estado: 'denegada' })
        .eq('id', id);
    } else if (action === 'correccion') {
      const { campos, observacion } = body;

      const { data: post } = await supabaseAdmin
        .from('postulaciones')
        .select('wa_user_id')
        .eq('id', id)
        .single();

      await supabaseAdmin
        .from('postulaciones')
        .update({
          estado: 'requiere_correccion',
          correcciones: JSON.stringify({
            campos: campos || [],
            observacion: observacion || '',
          }),
        })
        .eq('id', id);

      if (post?.wa_user_id && observacion?.trim()) {
        const camposList = (campos as string[]).map((c: string) => `• ${c}`).join('\n');
        const msg = `🔧 Tu postulación requiere algunas correcciones.\n\nCampos a actualizar:\n${camposList}\n\n${observacion}\n\nRespondé con los datos actualizados cuando estés listo.`;
        await meta.sendMessage(post.wa_user_id, msg).catch(console.error);
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "aceptar", "denegar", or "correccion"' },
        { status: 400 }
      );
    }

    // Fetch updated postulaciones to return
    const { data, error } = await supabaseAdmin
      .from('postulaciones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error processing postulaciones action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}