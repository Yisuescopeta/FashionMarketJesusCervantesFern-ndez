import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import node from '@astrojs/node';


// https://astro.build/config
export default defineConfig({
    // URL del sitio en producción (leer de variable de entorno)
    site: process.env.SITE_URL || 'http://localhost:4321',
    // Server mode para soportar SSR en páginas con prerender = false
    output: 'server',
    adapter: node({
        mode: 'standalone',
    }),
    integrations: [
        tailwind({
            applyBaseStyles: false,
        }),
        react(),
    ],
});