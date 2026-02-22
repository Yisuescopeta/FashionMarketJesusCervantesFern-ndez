import { addCartItem } from '../../stores/cart';
import { ShoppingBag } from 'lucide-react';

interface Props {
    id: string;
    name: string;
    price: number;
    image?: string;
}

export default function AddToCartButton({ id, name, price, image }: Props) {
    const handleAdd = () => {
        addCartItem({ id, name, price, image });
    };

    return (
        <button
            onClick={handleAdd}
            className="w-full bg-brand-navy text-white px-8 py-5 flex items-center justify-center space-x-3 font-bold tracking-[0.2em] uppercase text-xs hover:bg-black transition-all group shadow-lg shadow-navy-900/10"
        >
            <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Añadir a la Selección</span>
        </button>
    );
}
