import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import type { MetaCloudProvider } from '@/lib/messaging/meta-cloud';
import { getCategorias } from '@/lib/search/products';

const FIXED_CATS = ['Alimentos', 'Ropa', 'Calzado', 'Electrónica', 'Hogar', 'Accesorios', 'Otro'];

async function sendCategoryList(
  waUserId: string,
  postulacionId: string,
  metaProvider: MetaCloudProvider,
  seleccionadas: string[]
): Promise<void> {
  const cats = await getCategorias().catch(() => [] as string[]);
  const merged = Array.from(new Set([...cats, ...FIXED_CATS])).filter(c => !seleccionadas.includes(c));
  const rows = merged.slice(0, 10).map((cat) => ({ id: `comercio_cat_${postulacionId}_${cat}`, title: cat }));

  if (rows.length === 0) {
    await metaProvider.sendMessage(waUserId, 'Ya seleccionaste todas las categorías disponibles. Escribí "listo" para continuar.').catch(() => {});
    return;
  }

  if (rows.length <= 3) {
    await metaProvider.sendInteractiveButtons(waUserId, '¿Qué tipo de productos vendés? 👇', rows).catch(() => {});
  } else {
    await metaProvider.sendList(
      waUserId,
      'Elegí el tipo de productos que vendés 👇',
      'Ver categorías',
      [{ title: 'Categorías', rows }]
    ).catch(() => {});
  }
}

export async function manejarMerchantPostulacion(
  waUserId: string,
  paso: string,
  texto: string,
  imagenes: string[] = [],
  metaProvider?: MetaCloudProvider
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

      if (metaProvider) {
        await sendCategoryList(waUserId, postulacionId, metaProvider, []);
        return `|||categoria:${postulacionId}`;
      }
      return `¿Qué tipo de productos vendés?\n(Ej: Alimentos, Ropa, Electrónica)|||categoria:${postulacionId}`;
    }

    case 'categoria': {
      if (!postulacionId) return '❌ Error: sesión no encontrada. Escribí "Publicar mi negocio" para empezar.';
      // Fallback: text entry
      const cats = texto.trim();
      if (!cats) return `¿Qué tipo de productos vendés?|||categoria:${postulacionId}`;

      const { error } = await supabaseAdmin
        .from('postulaciones_comercio')
        .update({ categoria_productos: cats })
        .eq('id', postulacionId);

      if (error) return `❌ Error al guardar la categoría. Intentá de nuevo.|||categoria:${postulacionId}`;

      if (metaProvider) {
        await metaProvider.sendInteractiveButtons(
          waUserId,
          `✅ *${cats}* guardada.\n¿Querés agregar otra categoría?`,
          [
            { id: `comercio_cat_mas_${postulacionId}`, title: 'Agregar otra ➕' },
            { id: `comercio_cat_done_${postulacionId}`, title: 'Listo ✔️' },
          ]
        ).catch(() => {});
        return `|||categoria_mas:${postulacionId}`;
      }

      return `📍 ¿Cuál es la dirección del local?\n(calle, número, ciudad)|||direccion:${postulacionId}`;
    }

    case 'categoria_mas': {
      if (!postulacionId) return '❌ Error: sesión no encontrada.';
      const lower = texto.toLowerCase().trim();
      if (lower === 'listo' || lower === 'no' || lower === 'terminar') {
        return `📍 ¿Cuál es la dirección del local?\n(calle, número, ciudad)|||direccion:${postulacionId}`;
      }
      // User typed a category directly
      const { data: current } = await supabaseAdmin
        .from('postulaciones_comercio')
        .select('categoria_productos')
        .eq('id', postulacionId)
        .single();

      const existing = current?.categoria_productos ? `${current.categoria_productos}, ${texto.trim()}` : texto.trim();
      await supabaseAdmin
        .from('postulaciones_comercio')
        .update({ categoria_productos: existing })
        .eq('id', postulacionId);

      if (metaProvider) {
        await metaProvider.sendInteractiveButtons(
          waUserId,
          `✅ *${texto.trim()}* agregada.\n¿Querés agregar otra?`,
          [
            { id: `comercio_cat_mas_${postulacionId}`, title: 'Agregar otra ➕' },
            { id: `comercio_cat_done_${postulacionId}`, title: 'Listo ✔️' },
          ]
        ).catch(() => {});
        return `|||categoria_mas:${postulacionId}`;
      }
      return `📍 ¿Cuál es la dirección del local?|||direccion:${postulacionId}`;
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
