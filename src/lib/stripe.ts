import Stripe from 'stripe';

// Cliente de Stripe para el servidor
const STRIPE_KEY = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build';

export const stripe = new Stripe(STRIPE_KEY, {
    apiVersion: '2023-10-16', // Fixed version to match types if needed, or keep previous
});
