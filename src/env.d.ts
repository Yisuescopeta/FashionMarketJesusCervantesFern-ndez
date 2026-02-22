/// <reference types="astro/client" />

interface ImportMetaEnv {
    readonly PUBLIC_SUPABASE_URL: string;
    readonly PUBLIC_SUPABASE_ANON_KEY: string;
    readonly STRIPE_SECRET_KEY: string;
    readonly STRIPE_WEBHOOK_SECRET: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface Window {
    AppDialog: {
        alert: (message: string, title?: string) => Promise<void>;
        confirm: (message: string, title?: string) => Promise<boolean>;
        prompt: (message: string, defaultText?: string, title?: string) => Promise<string | null>;
    };
}
