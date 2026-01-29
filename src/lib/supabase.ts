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

// Service role key - accessed differently in server vs client
// In Astro, import.meta.env only works for PUBLIC_ prefixed vars in client
// For server-side, we need to use process.env or make it PUBLIC (not recommended for secrets)
let supabaseServiceKey: string | undefined;

if (typeof process !== 'undefined' && process.env) {
    // Server-side (Node.js environment)
    supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
} else {
    // Fallback for other environments
    supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
}

console.log('Service Role Key:', supabaseServiceKey ? `Loaded (${supabaseServiceKey.substring(0, 20)}...)` : 'MISSING ⚠️');

// Admin client that bypasses RLS (for server-side only)
export const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : supabase;

if (!supabaseServiceKey) {
    console.warn('⚠️ WARNING: Service Role Key not found! Using anon key instead. Orders may fail to save.');
}
