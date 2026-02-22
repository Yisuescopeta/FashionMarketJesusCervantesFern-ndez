import { createClient } from '@supabase/supabase-js';

// Server-side admin client that bypasses RLS
// Uses SUPABASE_SERVICE_ROLE_KEY – NEVER expose this on the client

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;

// Try multiple ways to load the service role key (Astro env handling varies by context)
let supabaseServiceKey: string | undefined;

if (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
} else {
    supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
}

if (!supabaseServiceKey) {
    console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY not found. Admin operations will fail.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
