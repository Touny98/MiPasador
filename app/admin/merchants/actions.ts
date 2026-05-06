'use server';

import { supabaseAdmin } from '@/lib/utils/supabase/admin';

export async function createMerchant(formData: FormData) {
  const name = formData.get('name') as string;
  const address = formData.get('address') as string;
  const phone_number = formData.get('phone_number') as string;

  const { error } = await supabaseAdmin
    .from('merchants')
    .insert([{ name, address, phone_number }]);

  if (error) {
    console.error('Error creating merchant:', error);
    throw error;
  }
}

export async function updateMerchant(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const address = formData.get('address') as string;
  const phone_number = formData.get('phone_number') as string;

  const { error } = await supabaseAdmin
    .from('merchants')
    .update({ name, address, phone_number })
    .eq('id', id);

  if (error) {
    console.error('Error updating merchant:', error);
    throw error;
  }
}

export async function deleteMerchant(id: string) {
  const { error } = await supabaseAdmin
    .from('merchants')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting merchant:', error);
    throw error;
  }
}

export async function acceptPostulacionComercio(id: string) {
  const { data: post, error: fetchError } = await supabaseAdmin
    .from('postulaciones_comercio')
    .select('nombre_negocio, direccion, wa_user_id')
    .eq('id', id)
    .single();

  if (fetchError || !post) {
    console.error('Error fetching postulacion:', fetchError);
    throw fetchError;
  }

  const { error: merchantError } = await supabaseAdmin
    .from('merchants')
    .insert({
      name: post.nombre_negocio || 'Sin nombre',
      address: post.direccion,
      phone_number: post.wa_user_id,
    });

  if (merchantError) {
    console.error('Error creating merchant:', merchantError);
    throw merchantError;
  }

  const { error: updateError } = await supabaseAdmin
    .from('postulaciones_comercio')
    .update({ estado: 'aceptada' })
    .eq('id', id);

  if (updateError) {
    console.error('Error updating postulacion:', updateError);
    throw updateError;
  }
}

export async function denyPostulacionComercio(id: string) {
  const { error } = await supabaseAdmin
    .from('postulaciones_comercio')
    .update({ estado: 'denegada' })
    .eq('id', id);

  if (error) {
    console.error('Error denying postulacion:', error);
    throw error;
  }
}