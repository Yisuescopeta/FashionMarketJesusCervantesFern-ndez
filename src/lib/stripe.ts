import Stripe from 'stripe';

// Cliente de Stripe para el servidor
export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-04-30.basil',
});
