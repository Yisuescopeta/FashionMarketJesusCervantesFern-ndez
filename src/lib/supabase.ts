import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials missing in environment variables.');
}

// Cliente público de Supabase (usa anon key, respeta RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


