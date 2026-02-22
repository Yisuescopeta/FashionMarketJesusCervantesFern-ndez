/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    navy: '#0F172A', // Navy Blue
                    charcoal: '#334155', // Charcoal
                    gold: '#B59410', // Muted Gold
                    leather: '#8B4513', // Leather
                    offwhite: '#F8FAFC',
                }
            },
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
                sans: ['"Inter"', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
