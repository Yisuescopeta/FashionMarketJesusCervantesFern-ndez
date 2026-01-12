import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    // Astro 5.0 uses 'static' by default and supports SSR on specific routes
    output: 'static',
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