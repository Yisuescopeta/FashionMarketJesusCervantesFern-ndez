import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

console.log('--- Supabase Debug ---');
console.log('URL:', supabaseUrl ? 'Configurada' : 'MISSING');
console.log('Anon Key:', supabaseAnonKey ? 'Configurada' : 'MISSING');
console.log('----------------------');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing in environment variables.');
}

// Cliente de Supabase estándar
// Cliente de Supabase estándar (para cliente/anon)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role key - In Astro, import.meta.env works for server-side code
// Non-PUBLIC_ prefixed vars are only available server-side (which is fine for supabaseAdmin)
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

console.log('Service Role Key:', supabaseServiceKey ? `Loaded (${supabaseServiceKey.substring(0, 20)}...)` : 'MISSING ⚠️');

// Admin client that bypasses RLS (for server-side only)
export const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : supabase;

if (!supabaseServiceKey) {
    console.warn('⚠️ WARNING: Service Role Key not found! Using anon key instead. Orders may fail to save.');
}
