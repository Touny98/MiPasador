import { MetaCloudProvider, ListSection } from '../messaging/meta-cloud';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { generarLinkPago, registrarComision as registrarComisionMercadoPago } from '@/lib/pasador/comisiones';
import { generarPostulacionPdf } from '@/lib/utils/pdf/generatePostulacionPdf';

// Type for MetaCloudProvider - we should probably export this from meta-cloud.ts
const metaProvider = new MetaCloudProvider(
  process.env.META_ACCESS_TOKEN!,
  process.env.META_PHONE_NUMBER_ID!
);

// Types for our flow state
interface PasadorFlowState {
  step: 'inicio' | 'ubicacion' | 'ruta' | 'peso' | 'descripcion' | 'confirmacion';
  data: {
    ubicacion?: { lat: number; lng: number }; // from WhatsApp location message
    ruta?: string; // route string for pricing (e.g., "Centro - Aeropuerto")
    peso?: number; // in kg
    descripcion?: string;
    precio?: number;
    pasadorId?: number;
    viajeId?: number; // id of the viaje record
  };
}


// We'll store the state in the conversation context JSON under the key 'pasador_flow'
const PASADOR_FLOW_KEY = 'pasador_flow';

/**
 * Detect the intention of the user's message regarding pasador service.
 */
export function detectarIntencionPasador(texto: string): 'solicitar' | 'comando' | 'postular' | null {
  const lower = texto.toLowerCase().trim();

  // Check for command: starts with * followed by one of the keywords
  if (lower.startsWith('*')) {
    const comando = lower.substring(1).trim().toUpperCase();
    if (['ACTIVO', 'ACEPTO', 'RECHAZO', 'LISTO', 'DESCONECTAR'].includes(comando)) {
      return 'comando';
    }
  }

  // Check for solicitud: contains certain keywords
  const solicitudKeywords = ['pasador', 'enviar a', 'llevar', 'transportar', 'cruzar'];
  if (solicitudKeywords.some(keyword => lower.includes(keyword))) {
    return 'solicitar';
  }

  // Check for postular: contains certain phrases
  const postularKeywords = ['ser pasador', 'postular', 'trabajar'];
  if (postularKeywords.some(keyword => lower.includes(keyword))) {
    return 'postular';
  }

  return null;
}

/**
 * Handle the pasador solicitation flow.
 * @param waUserId WhatsApp user ID
 * @param texto User's message
 * @param estadoConversacion Current conversation state (from conversations.context_json)
 * @returns Promise with { respuesta: string, estado: any } where estado is the updated state to save
 */
export async function manejarSolicitud(
  waUserId: string,
  texto: string,
  estadoConversacion: any
): Promise<{ respuesta: string; estado: any }> {
  // Initialize or get state
  let state: PasadorFlowState = estadoConversacion?.pasador_flow ?? {
    step: 'inicio',
    data: {}
  };

  // Step: inicio -> ask for location
  if (state.step === 'inicio') {
    state.step = 'ubicacion';
    state.data = {}; // reset data
    return {
      respuesta: '📍 ¿Dónde estás?\nCompartí tu ubicación por WhatsApp.',
      estado: state
    };
  }

  // Step: ubicacion -> we expect to have location in state.data.ubicacion (set by webhook when location message received)
  // If we don't have it, we ask again.
  if (state.step === 'ubicacion') {
    // Check if we have location
    if (!state.data.ubicacion) {
      // We don't have location yet, ask again
      return {
        respuesta: '📍 No recibí tu ubicación. Tocá el clip 📎 y elegí Ubicación.',
        estado: state
      };
    }
    // We have location, now ask for route
    state.step = 'ruta';
    return {
      respuesta: '🏠 ¿Cuál es tu dirección actual?\nEscribila completa (calle, número, ciudad).',
      estado: state
    };
  }


  // Step: ruta -> we expect texto to be the route
  if (state.step === 'ruta') {
    state.data.ruta = texto.trim();
    state.step = 'peso';
    return {
      respuesta: '⚖️ ¿Cuánto pesa el bulto?',
      estado: state
    };
  }

  // Step: peso -> we expect texto to be a number
  if (state.step === 'peso') {
    const peso = parseFloat(texto);
    if (isNaN(peso) || peso <= 0) {
      return {
        respuesta: '⚠️ Por favor, ingresá un peso válido en kg (mayor a 0).',
        estado: state
      };
    }
    state.data.peso = peso;
    state.step = 'descripcion';
    return {
      respuesta: '📝 ¿Qué enviás? Describilo brevemente.',
      estado: state
    };
  }

  // Step: descripcion -> we expect texto to be the description
  if (state.step === 'descripcion') {
    state.data.descripcion = texto.trim();
    // Now we have all data: ubicacion, ruta, peso, descripcion
    // We need to calculate the price
    if (!state.data.ruta || state.data.peso === undefined) {
      state.step = 'inicio';
      return { respuesta: '⚠️ Falta información del pedido. Empecemos de nuevo.', estado: state };
    }
    const precio = await calcularPrecio(state.data.ruta, state.data.peso);
    state.data.precio = precio;

    const pasador = await asignarPasador();

    if (!pasador) {
      state.step = 'inicio';
      return {
        respuesta: '😔 Sin pasadores disponibles ahora.\nIntentá en un rato.',
        estado: state
      };
    }

    state.data.pasadorId = pasador.id;

    // Now we create a viaje record
    const { data: viaje, error } = await supabaseAdmin
      .from('viajes')
      .insert({
        pasador_id: state.data.pasadorId,
        usuario_wa_id: waUserId,
        direccion_origen: state.data.ubicacion ? `${state.data.ubicacion.lat},${state.data.ubicacion.lng}` : '',
        direccion_destino: state.data.descripcion, // We'll use descripcion as destination for now, but ideally we'd have a separate destination field
        peso: state.data.peso,
        precio_ars: state.data.precio,
        estado: 'asignado',
        ruta: state.data.ruta,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating viaje:', error);
      state.step = 'inicio';
      return {
        respuesta: '😢 Ocurrió un error al crear el viaje. Por favor, intentá de nuevo.',
        estado: state
      };
    }

    state.data.viajeId = viaje.id;
    state.step = 'confirmacion';

    // Notify the assigned pasador
    const { data: pasadorInfo } = await supabaseAdmin
      .from('pasadores')
      .select('wa_user_id')
      .eq('id', state.data.pasadorId)
      .single();
    if (pasadorInfo?.wa_user_id) {
      await metaProvider.sendMessage(
        pasadorInfo.wa_user_id,
        `🔔 Nuevo viaje asignado!\nRuta: ${state.data.ruta}\nPeso: ${state.data.peso} kg\nPrecio: $${precio.toFixed(2)} ARS\nRespondé *ACEPTO para aceptar o *RECHAZO para rechazar.`
      ).catch(() => {});
    }

    return {
      respuesta: `✅ ¡Listo! Pasador asignado: ${pasador.nombre_completo || 'Sin nombre'}.\n💰 Precio: $${precio.toFixed(2)} ARS\nTe avisamos cuando acepte.`,
      estado: state
    };
  }

  // Step: confirmacion -> we wait for user to confirm? Actually, we already created the viaje.
  // We'll just reset the state and ask if they want to make another request.
  if (state.step === 'confirmacion') {
    // We'll reset the state for a new request
    state.step = 'inicio';
    state.data = {};
    return {
      respuesta: '📦 Tu viaje está en proceso. Para hacer otro viaje, escribí "pasador".',
      estado: state
    };
  }

  // Default: reset state
  state.step = 'inicio';
  state.data = {};
  return {
    respuesta: 'Algo salió mal. Empecemos de nuevo: escribí "pasador" para solicitar un viaje.',
    estado: state
  };
}

/**
 * Calculate price based on route and weight.
 * @param ruta Route string (e.g., "Centro - Aeropuerto")
 * @param peso Weight in kg
 * @returns Price in ARS
 */
export async function calcularPrecio(ruta: string, peso: number): Promise<number> {
  // Consultar tarifas_pasador
  const { data, error } = await supabaseAdmin
    .from('tarifas_pasador')
    .select('precio_ars')
    .eq('ruta', ruta)
    .lte('peso_min', peso)
    .gte('peso_max', peso)
    .eq('activa', true)
    .single();

  if (!error && data) {
    return data.precio_ars ?? 0;
  }

  const { data: allTarifas, error: tarifasError } = await supabaseAdmin
    .from('tarifas_pasador')
    .select('precio_ars, peso_min, peso_max')
    .eq('ruta', ruta)
    .eq('activa', true);

  if (tarifasError || !allTarifas || allTarifas.length === 0) {
    return 100 + peso * 10;
  }

  const matching = allTarifas.find(t =>
    t.peso_min !== null && t.peso_max !== null &&
    peso >= t.peso_min && peso <= t.peso_max
  );
  if (matching) {
    return matching.precio_ars ?? 0;
  }

  let best = allTarifas[0];
  let bestDistance = Infinity;
  for (const t of allTarifas) {
    let distance = 0;
    if (t.peso_min !== null && peso < t.peso_min) {
      distance = t.peso_min - peso;
    } else if (t.peso_max !== null && peso > t.peso_max) {
      distance = peso - t.peso_max;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      best = t;
    }
  }

  return best.precio_ars ?? 0;
}

/**
 * Assign the best available pasador.
 * @returns Pasador object or null if none available
 */
export async function asignarPasador(): Promise<{ id: number; nombre_completo: string | null; reputacion_promedio: number | null; cantidad_viajes_completados: number | null } | null> {
  // Buscar pasadores activos (activo=true) ordenados por reputacion_promedio DESC, cantidad_viajes_completados DESC.
  const { data, error } = await supabaseAdmin
    .from('pasadores')
    .select('id, nombre_completo, reputacion_promedio, cantidad_viajes_completados')
    .eq('activo', true)
    .eq('estado', 'disponible')
    .order('reputacion_promedio', { ascending: false })
    .order('cantidad_viajes_completados', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
}

/**
 * Handle commands from pasadores (messages starting with *)
 * @param waUserId WhatsApp user ID of the pasador
 * @param comando Command string without the * (e.g., "ACTIVO")
 * @returns Response string
 */
export async function manejarComando(waUserId: string, comando: string): Promise<string> {
  const upperComando = comando.trim().toUpperCase();

  // First, verify that the waUserId corresponds to a pasador
  const { data: pasador, error: pasadorError } = await supabaseAdmin
    .from('pasadores')
    .select('id, activo')
    .eq('wa_user_id', waUserId)
    .single();

  if (pasadorError || !pasador) {
    return '❌ No estás registrado como pasador. Primero debes postularte.';
  }

  switch (upperComando) {
    case 'ACTIVO': {
      // Verificar si es pasador, poner activo=true, insertar en sesiones_pasador (inicio ahora)
      const { error: updateError } = await supabaseAdmin
        .from('pasadores')
        .update({ activo: true, estado: 'disponible' })
        .eq('id', pasador.id);

      if (updateError) {
        return '❌ Error al activarte. Intentá de nuevo.';
      }

      // Insertar en sesiones_pasador
      const { error: sessionError } = await supabaseAdmin
        .from('sesiones_pasador')
        .insert({
          pasador_id: pasador.id,
          inicio: new Date().toISOString()
        });

      if (sessionError) {
        // We don't rollback the activo update for simplicity
        return '⚠️ Pasador activado, pero hubo un error al iniciar la sesión.';
      }

      return '✅ Estás activo, esperando viajes.';
    }

    case 'ACEPTO': {
      // Si tiene un viaje asignado (estado='asignado'), cambiar a 'aceptado', notificar al usuario: "Pasador aceptó, en camino."
      // We need to find a viaje assigned to this pasador with estado='asignado'
      const { data: viajes, error: viajesError } = await supabaseAdmin
        .from('viajes')
        .select('id, estado, usuario_wa_id')
        .eq('pasador_id', pasador.id)
        .eq('estado', 'asignado')
        .single();

      if (viajesError || !viajes) {
        return '❌ No tienes un viaje asignado para aceptar.';
      }

      // Update viaje estado to 'aceptado'
      const { error: updateError } = await supabaseAdmin
        .from('viajes')
        .update({ estado: 'aceptado' })
        .eq('id', viajes.id);

      if (updateError) {
        return '❌ Error al aceptar el viaje.';
      }

      await supabaseAdmin.from('pasadores').update({ estado: 'ocupado' }).eq('id', pasador.id);

      // Notify the user that their pasador is on the way
      if (viajes.usuario_wa_id) {
        await metaProvider.sendMessage(
          viajes.usuario_wa_id,
          '🚚 ¡Tu pasador aceptó el viaje y está en camino!'
        ).catch(() => {});
      }

      return '✅ Viaje aceptado. El usuario fue notificado.';
    }

    case 'RECHAZO': {
      const { data: viaje, error: viajeError } = await supabaseAdmin
        .from('viajes')
        .select('id, estado')
        .eq('pasador_id', pasador.id)
        .in('estado', ['asignado', 'aceptado'])
        .single();

      if (viajeError || !viaje) {
        return '❌ No tenés un viaje activo para rechazar.';
      }

      // Liberar al pasador actual
      await supabaseAdmin.from('pasadores').update({ estado: 'disponible' }).eq('id', pasador.id);

      // Intentar reasignar a otro pasador disponible
      const nuevoPasador = await asignarPasador();
      if (!nuevoPasador) {
        await supabaseAdmin.from('viajes').update({ estado: 'cancelado' }).eq('id', viaje.id);
        return '✅ Viaje rechazado. No hay pasadores disponibles, el viaje fue cancelado.';
      }

      const { error: updatePasadorError } = await supabaseAdmin
        .from('viajes')
        .update({ pasador_id: nuevoPasador.id, estado: 'asignado' })
        .eq('id', viaje.id);

      if (updatePasadorError) {
        return '✅ Viaje rechazado. Error al reasignar a otro pasador.';
      }

      return '✅ Viaje rechazado. Buscando otro pasador...';
    }

    case 'LISTO': {
      // Viaje a 'completado', pedir rating al usuario, calcular comisión.
      // Find a viaje assigned to this pasador with estado='aceptado' (or maybe 'en camino'? we don't have that state)
      // We'll look for viaje with estado='aceptado' for this pasador.
      const { data: viaje, error: viajeError } = await supabaseAdmin
        .from('viajes')
        .select('id, estado, usuario_wa_id, precio_ars')
        .eq('pasador_id', pasador.id)
        .eq('estado', 'aceptado')
        .single();

      if (viajeError || !viaje) {
        return '❌ No tienes un viaje aceptado para marcar como completado.';
      }

      // Update viaje estado to 'completado'
      const { error: updateError } = await supabaseAdmin
        .from('viajes')
        .update({ estado: 'completado', completado_at: new Date().toISOString() })
        .eq('id', viaje.id);

      if (updateError) {
        return '❌ Error al marcar el viaje como completado.';
      }

      // Resetear estado pasador a disponible e incrementar contador de viajes
      const { data: pasadorData } = await supabaseAdmin
        .from('pasadores')
        .select('cantidad_viajes_completados')
        .eq('id', pasador.id)
        .single();
      const newCount = (pasadorData?.cantidad_viajes_completados ?? 0) + 1;
      await supabaseAdmin
        .from('pasadores')
        .update({ estado: 'disponible', cantidad_viajes_completados: newCount })
        .eq('id', pasador.id);

      return '✅ Viaje marcado como completado. Se ha solicitado un rating al usuario.';
    }

    case 'DESCONECTAR': {
      // Cerrar sesión, generar resumen y link de pago.
      // First, set activo to false
      const { error: updateError } = await supabaseAdmin
        .from('pasadores')
        .update({ activo: false })
        .eq('id', pasador.id);

      if (updateError) {
        return '❌ Error al desconectarte.';
      }

      // Cerrar la sesión actual: we'll update the latest sesiones_pasador for this pasador to set fin now
      const { data: sesiones, error: sesionesError } = await supabaseAdmin
        .from('sesiones_pasador')
        .select('id, inicio, fin')
        .eq('pasador_id', pasador.id)
        .is('fin', null)
        .order('inicio', { ascending: false })
        .limit(1);

      if (!sesionesError && sesiones && sesiones.length > 0) {
        // Calculate commission for completed viajes in this session
        const inicioSesion = sesiones[0].inicio ?? new Date(0).toISOString();

        // Get completed viajes for this pasador since the session inicio
        const { data: viajesCompletados, error: viajesError } = await supabaseAdmin
          .from('viajes')
          .select('id, precio_ars')
          .eq('pasador_id', pasador.id)
          .eq('estado', 'completado')
          .gte('completado_at', inicioSesion)
          .order('completado_at', { ascending: true });

        if (viajesError) {
          return '✅ Sesión cerrada. Error al obtener viajes completados.';
        }

        // Calculate commission: we'll use a fixed percentage (e.g., 10%) of the total precio
        const totalPrecio = viajesCompletados.reduce((sum, viaje) => sum + (viaje.precio_ars || 0), 0);
        const porcentajeComision = 0.10; // 10%
        const montoComision = totalPrecio * porcentajeComision;

        // We'll update the sesiones_pasador with the total_comision
        await supabaseAdmin
          .from('sesiones_pasador')
          .update({ fin: new Date().toISOString(), total_comision: montoComision })
          .eq('id', sesiones[0].id);

        // Generate link of pago using our mercadopago module
        const linkPago = await generarLinkPago(pasador.id, montoComision);

        // Register the commission using our mercadopago module
        await registrarComisionMercadoPago(pasador.id, new Date().toISOString(), totalPrecio, montoComision, linkPago, viajesCompletados.length);

        // Return resumen and link de pago
        return `
✅ Sesión cerrada.
📊 Resumen:
  - Viajes completados: ${viajesCompletados.length}
  - Total facturado: $${totalPrecio.toFixed(2)} ARS
  - Comisión ($${porcentajeComision * 100}%): $${montoComision.toFixed(2)} ARS
💳 Link de pago: ${linkPago}
      `.trim();
      }

      return '✅ Sesión cerrada. No hay viajes completados en esta sesión.';
    }

    default:
      return '❌ Comando no reconocido. Usá: *ACTIVO, *ACEPTO, *RECHAZO, *LISTO, *DESCONECTAR.';
  }
}

/**
 * Handle the pasador postulation flow.
 * Returns "message|||nextStep" so the dispatcher can advance the step.
 * Terminal responses (end of flow or errors with no retry) return plain strings.
 */
export async function manejarPostulacion(
  waUserId: string,
  paso: string,
  texto: string,
  imagenes: string[] = []
): Promise<string> {
  const [stepKey, postulacionIdStr] = (paso || 'inicio').split(':');
  const postulacionId = postulacionIdStr ? parseInt(postulacionIdStr, 10) : null;
  const currentStep = stepKey || 'inicio';

  switch (currentStep) {
    case 'inicio':
      return '📄 Vamos a iniciar tu postulación como pasador. Por favor, ingresá tu nombre completo:|||nombre';

    case 'nombre': {
      const { data: nuevaPostulacion, error } = await supabaseAdmin
        .from('postulaciones')
        .insert({ wa_user_id: waUserId, nombre_completo: texto.trim(), estado: 'pendiente' })
        .select('id')
        .single();

      if (error || !nuevaPostulacion) {
        return '❌ Error al guardar tu nombre. Intentá de nuevo.|||nombre';
      }

      return `Gracias, ${texto.trim()}. Ahora ingresá tu DNI (solo números):|||dni:${nuevaPostulacion.id}`;
    }

    case 'dni': {
      if (!postulacionId) return '❌ Error de estado. Escribí "ser pasador" para empezar de nuevo.';

      const { error } = await supabaseAdmin
        .from('postulaciones')
        .update({ dni: texto.trim() })
        .eq('id', postulacionId);

      if (error) return `❌ Error al guardar tu DNI. Intentá de nuevo.|||dni:${postulacionId}`;

      return `📸 Enviá una foto clara del frente de tu DNI:|||imagen_frente:${postulacionId}`;
    }

    case 'imagen_frente': {
      if (!postulacionId) return '❌ Error de estado. Escribí "ser pasador" para empezar de nuevo.';

      if (imagenes.length === 0) {
        return `⚠️ No recibí la imagen. Enviá una foto del frente de tu DNI:|||imagen_frente:${postulacionId}`;
      }

      const { error } = await supabaseAdmin
        .from('postulaciones')
        .update({ imagen_frente_url: imagenes[0] })
        .eq('id', postulacionId);

      if (error) return `❌ Error al guardar la imagen. Intentá de nuevo.|||imagen_frente:${postulacionId}`;

      return `📸 Ahora enviá una foto clara del dorso de tu DNI:|||imagen_dorso:${postulacionId}`;
    }

    case 'imagen_dorso': {
      if (!postulacionId) return '❌ Error de estado. Escribí "ser pasador" para empezar de nuevo.';

      if (imagenes.length === 0) {
        return `⚠️ No recibí la imagen. Enviá una foto del dorso de tu DNI:|||imagen_dorso:${postulacionId}`;
      }

      const { error: updateErrorDorso } = await supabaseAdmin
        .from('postulaciones')
        .update({ imagen_dorso_url: imagenes[0] })
        .eq('id', postulacionId);

      if (updateErrorDorso) return `❌ Error al guardar la imagen del dorso. Intentá de nuevo.|||imagen_dorso:${postulacionId}`;

      const { data: postulacionData, error: fetchError } = await supabaseAdmin
        .from('postulaciones')
        .select('nombre_completo, dni, imagen_frente_url, imagen_dorso_url')
        .eq('id', postulacionId)
        .single();

      if (fetchError || !postulacionData) {
        return '❌ Error al obtener los datos de la postulación. Intentá de nuevo.';
      }

      try {
        const pdfUrl = await generarPostulacionPdf({
          nombre_completo: postulacionData.nombre_completo ?? '',
          dni: postulacionData.dni ?? '',
          imagen_frente_url: postulacionData.imagen_frente_url ?? '',
          imagen_dorso_url: postulacionData.imagen_dorso_url ?? '',
        });

        await supabaseAdmin
          .from('postulaciones')
          .update({ pdf_url: pdfUrl, estado: 'lista_para_revision' })
          .eq('id', postulacionId);
      } catch {
        await supabaseAdmin
          .from('postulaciones')
          .update({ estado: 'lista_para_revision' })
          .eq('id', postulacionId);
      }

      return '✅ ¡Postulación completada! Un administrador la revisará y se comunicará con vos.';
    }

    default:
      return '❌ Paso no reconocido. Escribí "ser pasador" para empezar de nuevo.';
  }
}

