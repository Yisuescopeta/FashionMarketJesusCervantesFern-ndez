import { useStore } from '@nanostores/react';
import { cartCount } from '../../stores/cart';

export default function CartCount() {
    const count = useStore(cartCount);

    if (count === 0) return null;

    return (
        <span className="absolute -top-1 -right-1 bg-brand-navy text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
            {count}
        </span>
    );
}
