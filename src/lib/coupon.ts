import { supabaseAdmin } from './supabase-admin';

export interface CouponValidationResult {
    valid: boolean;
    error?: string;
    coupon?: {
        id: string;
        code: string;
        discount_type: 'percent' | 'fixed';
        discount_value: number;
        usage_limit: number | null;
        is_single_use: boolean;
    };
    discountAmount?: number;
}

export async function validateCoupon(
    code: string,
    userId: string | undefined,
    cartTotal: number
): Promise<CouponValidationResult> {
    if (!code) return { valid: false, error: 'Código requerido' };

    // 1. Buscar cupón
    const { data: coupon, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

    if (error || !coupon) {
        return { valid: false, error: 'Cupón inválido' };
    }

    // 2. Verificar estado activo
    if (!coupon.is_active) {
        return { valid: false, error: 'Este cupón ya no está activo' };
    }

    // 3. Verificar expiración
    if (coupon.expiration_date && new Date(coupon.expiration_date) < new Date()) {
        return { valid: false, error: 'Este cupón ha expirado' };
    }

    // 4. Verificar límite de uso global
    if (coupon.usage_limit) {
        const { count, error: countError } = await supabaseAdmin
            .from('user_coupons')
            .select('*', { count: 'exact', head: true })
            .eq('coupon_id', coupon.id);

        if (countError) {
            console.error('Error checking usage limit:', countError);
            return { valid: false, error: 'Error al validar cupón' };
        }

        if (count !== null && count >= coupon.usage_limit) {
            return { valid: false, error: 'Este cupón ha alcanzado su límite de uso' };
        }
    }

    // 5. Verificar uso único por usuario
    if (coupon.is_single_use) {
        if (!userId) {
            return { valid: false, error: 'Inicia sesión para usar este cupón' };
        }

        const { data: usage } = await supabaseAdmin
            .from('user_coupons')
            .select('id')
            .eq('coupon_id', coupon.id)
            .eq('user_id', userId)
            .single();

        if (usage) {
            return { valid: false, error: 'Ya has utilizado este cupón' };
        }
    }

    // 6. Calcular descuento
    let discountAmount = 0;
    if (coupon.discount_type === 'percent') {
        discountAmount = Math.round((cartTotal * coupon.discount_value) / 100);
    } else {
        // Fixed value assumed to be in the same currency unit as cartTotal?
        // DB stores e.g. 10.00. Cart usually cents.
        // Let's assume DB value is in EUROS (major units) and cartTotal is CENTS.
        const fixedValueCents = coupon.discount_value * 100;
        discountAmount = Math.min(fixedValueCents, cartTotal);
    }

    return {
        valid: true,
        coupon,
        discountAmount
    };
}
