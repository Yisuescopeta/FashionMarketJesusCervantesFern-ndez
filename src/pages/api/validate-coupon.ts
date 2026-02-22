import type { APIRoute } from 'astro';
import { validateCoupon } from '../../lib/coupon';

export const POST: APIRoute = async ({ request }) => {
    try {
        const { code, userId, cartTotal } = await request.json();

        const result = await validateCoupon(code, userId, cartTotal);

        if (!result.valid) {
            return new Response(JSON.stringify({ error: result.error }), { status: 400 });
        }

        return new Response(JSON.stringify({
            valid: true,
            coupon: {
                code: result.coupon?.code,
                type: result.coupon?.discount_type,
                value: result.coupon?.discount_value,
                id: result.coupon?.id
            },
            discountAmount: result.discountAmount
        }), { status: 200 });

    } catch (e) {
        console.error("Error validating coupon:", e);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500 });
    }
}
