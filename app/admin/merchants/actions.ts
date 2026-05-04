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