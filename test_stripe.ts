import { stripe } from './src/lib/stripe.ts';
import * as dotenv from 'dotenv';
dotenv.config();

async function testStripeMetadata() {
    try {
        // Fetch sessions
        const sessions = await stripe.checkout.sessions.list({ limit: 10 });
        const completedSessions = sessions.data.filter(s => s.status === 'complete');
        if (completedSessions.length === 0) {
            console.log("No completed sessions found.");
            return;
        }

        const session = completedSessions[0];
        console.log(`Session ID: ${session.id}`);

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            expand: ['data.price.product'],
        });

        for (const item of lineItems.data) {
            console.log("--- Item ---");
            console.log(`Quantity: ${item.quantity}`);
            if (item.price?.product) {
                const product = item.price.product as any;
                console.log(`Product Name: ${product.name}`);
                console.log(`Product Metadata:`, product.metadata);
            } else {
                console.log("No product attached to price.");
            }
        }
    } catch (e) {
        console.error(e);
    }
}

testStripeMetadata();
