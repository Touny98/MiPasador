import { supabaseAdmin } from '@/lib/utils/supabase/admin';

export async function manejarMerchantPostulacion(
  waUserId: string,
  paso: string,
  texto: string,
  imagenes: string[] = []
): Promise<string> {
  const [stepKey, postulacionIdStr] = (paso || 'inicio').split(':');
  const postulacionId = postulacionIdStr || null;
  const currentStep = stepKey || 'inicio';

  switch (currentStep) {
    case 'inicio': {
      const { data, error } = await supabaseAdmin
        .from('postulaciones_comercio')
        .insert({ wa_user_id: waUserId, estado: 'pendiente' })
        .select('id')
        .single();

      if (error || !data) {
        console.error('Error iniciando postulacion comercio:', error);
        return '❌ Hubo un error al iniciar tu registro. Intentá de nuevo más tarde.';
      }

      return `¡Genial! 🏪 Vamos a registrar tu negocio.\n¿Cuál es tu nombre completo?|||nombre:${data.id}`;
    }

    case 'nombre': {
      if (!postulacionId) return '❌ Error: sesión no encontrada. Escribí "Publicar mi negocio" para empezar.';
      const { error } = await supabaseAdmin
        .from('postulaciones_comercio')
        .update({ nombre_completo: texto.trim() })
        .eq('id', postulacionId);

      if (error) return `❌ Error al guardar tu nombre. Intentá de nuevo.|||nombre:${postulacionId}`;
      return `Gracias. ¿Cómo se llama tu negocio?|||nombre_negocio:${postulacionId}`;
    }

    case 'nombre_negocio': {
      if (!postulacionId) return '❌ Error: sesión no encontrada. Escribí "Publicar mi negocio" para empezar.';
      const { error } = await supabaseAdmin
        .from('postulaciones_comercio')
        .update({ nombre_negocio: texto.trim() })
        .eq('id', postulacionId);

      if (error) return `❌ Error al guardar el nombre del negocio. Intentá de nuevo.|||nombre_negocio:${postulacionId}`;
      return `¿Cuál es tu número de DNI?|||dni:${postulacionId}`;
    }

    case 'dni': {
      if (!postulacionId) return '❌ Error: sesión no encontrada. Escribí "Publicar mi negocio" para empezar.';
      const { error } = await supabaseAdmin
        .from('postulaciones_comercio')
        .update({ dni: texto.trim() })
        .eq('id', postulacionId);

      if (error) return `❌ Error al guardar tu DNI. Intentá de nuevo.|||dni:${postulacionId}`;
      return `¿Qué tipo de productos vendés?\n(Ej: Alimentos, Ropa, Electrodomésticos)|||categoria:${postulacionId}`;
    }

    case 'categoria': {
      if (!postulacionId) return '❌ Error: sesión no encontrada. Escribí "Publicar mi negocio" para empezar.';
      const { error } = await supabaseAdmin
        .from('postulaciones_comercio')
        .update({ categoria_productos: texto.trim() })
        .eq('id', postulacionId);

      if (error) return `❌ Error al guardar la categoría. Intentá de nuevo.|||categoria:${postulacionId}`;
      return `📍 ¿Cuál es la dirección del local?\n(calle, número, ciudad)|||direccion:${postulacionId}`;
    }

    case 'direccion': {
      if (!postulacionId) return '❌ Error: sesión no encontrada. Escribí "Publicar mi negocio" para empezar.';
      const { error } = await supabaseAdmin
        .from('postulaciones_comercio')
        .update({ direccion: texto.trim() })
        .eq('id', postulacionId);

      if (error) return `❌ Error al guardar la dirección. Intentá de nuevo.|||direccion:${postulacionId}`;
      return `📸 Enviá una foto del frente del local.|||foto_local:${postulacionId}`;
    }

    case 'foto_local': {
      if (!postulacionId) return '❌ Error: sesión no encontrada. Escribí "Publicar mi negocio" para empezar.';
      if (imagenes.length === 0) {
        return `⚠️ No recibí la foto. Por favor, enviá una foto del frente del local.|||foto_local:${postulacionId}`;
      }

      const { error } = await supabaseAdmin
        .from('postulaciones_comercio')
        .update({ foto_local_url: imagenes[0] })
        .eq('id', postulacionId);

      if (error) return `❌ Error al guardar la foto. Intentá de nuevo.|||foto_local:${postulacionId}`;
      return '✅ ¡Postulación enviada!\nUn administrador la revisará y te contactamos pronto.';
    }

    default:
      return '❌ Paso no reconocido. Escribí "Publicar mi negocio" para empezar de nuevo.';
  }
}
