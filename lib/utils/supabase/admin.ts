import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Initialize Supabase admin client for service role (server-side)
const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!adminUrl || !adminKey) {
  throw new Error('Missing Supabase environment variables for admin client');
}

export const supabaseAdmin = createClient<Database>(adminUrl, adminKey);