import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;

// TEMPORARY: Hardcoded service role key because Astro's import.meta.env doesn't load non-PUBLIC vars reliably
// TODO: Move this to a proper server-side environment variable solution
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxbXhrcXJlbW9pbm55YXVtaXN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODExMDQ0MCwiZXhwIjoyMDgzNjg2NDQwfQ._em5AaYEHrkD0upf4himoUe-I4Zaa_8QJSLRz24I2oI';

if (!supabaseUrl) {
    throw new Error('Missing PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Admin client that bypasses RLS (for server-side only)
// This should ONLY be used in server-side code (API routes, SSR pages)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
