import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import node from '@astrojs/node';


// https://astro.build/config
export default defineConfig({
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