import { useStore } from '@nanostores/react';
import { isCartOpen, cartItems, removeCartItem, updateQuantity, cartTotal } from '../../stores/cart';
import { formatPrice } from '../../lib/utils';
import { X, Minus, Plus, ShoppingBag, LogIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CartSlider() {
    const $isCartOpen = useStore(isCartOpen);
    const $cartItems = useStore(cartItems);
    const $cartTotal = useStore(cartTotal);
    const sliderRef = useRef<HTMLDivElement>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [stockCache, setStockCache] = useState<Record<string, number>>({});
    const [stockError, setStockError] = useState<string | null>(null);

    // Cargar stock de los productos en el carrito
    useEffect(() => {
        const loadStock = async () => {
            const productIds = $cartItems.map(item => {
                const parts = item.id.split('-');
                return parts.slice(0, -1).join('-');
            });
            const uniqueIds = [...new Set(productIds)];

            if (uniqueIds.length === 0) return;

            const { data } = await supabase
                .from('products')
                .select('id, sizes')
                .in('id', uniqueIds);

            if (data) {
                const cache: Record<string, number> = {};
                data.forEach(product => {
                    if (product.sizes && typeof product.sizes === 'object') {
                        const sizes = product.sizes as Record<string, number>;
                        Object.entries(sizes).forEach(([size, stock]) => {
                            cache[`${product.id}-${size}`] = Number(stock);
                        });
                    }
                });
                setStockCache(cache);
            }
        };

        if ($isCartOpen) {
            loadStock();
        }
    }, [$isCartOpen, $cartItems]);

    // Verificar autenticación del usuario
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setIsAuthenticated(!!user);
            setIsLoading(false);
        };
        checkAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setIsAuthenticated(!!session?.user);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') isCartOpen.set(false);
        };

        if ($isCartOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
            document.body.style.overflowX = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.body.style.overflowX = 'hidden'; // Siempre ocultar scroll horizontal
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [$isCartOpen]);

    const handleIncrement = (itemId: string, currentQuantity: number) => {
        const maxStock = stockCache[itemId];
        const newQuantity = currentQuantity + 1;

        if (maxStock !== undefined && newQuantity > maxStock) {
            setStockError(`Solo hay ${maxStock} unidades disponibles`);
            setTimeout(() => setStockError(null), 3000);
            return;
        }

        updateQuantity(itemId, newQuantity, maxStock);
    };

    const handleCheckout = () => {
        if (!isAuthenticated) {
            window.location.href = '/login?redirect=/carrito';
        } else {
            window.location.href = '/carrito';
        }
    };

    // Si el carrito está cerrado, no renderizar nada para evitar problemas de overflow
    if (!$isCartOpen) {
        return null;
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-300 opacity-100"
                onClick={() => isCartOpen.set(false)}
            />

            {/* Panel del carrito */}
            <div
                ref={sliderRef}
                className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[60] shadow-2xl flex flex-col"
                style={{ height: '100dvh' }}
            >
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-serif font-bold italic">Carrito</h2>
                    <button onClick={() => isCartOpen.set(false)} className="p-2 hover:bg-slate-100 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Mensaje de error de stock */}
                {stockError && (
                    <div className="flex-shrink-0 px-6 py-2 bg-red-50 border-b border-red-100">
                        <p className="text-xs text-red-600 font-medium text-center">{stockError}</p>
                    </div>
                )}

                {/* Lista de productos - scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 min-h-0">
                    {$cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <ShoppingBag className="w-12 h-12 opacity-20" />
                            <p className="font-serif italic">Tu selección está vacía</p>
                        </div>
                    ) : (
                        $cartItems.map((item) => (
                            <div key={item.id} className="flex space-x-4">
                                <div className="w-20 h-24 bg-slate-100 flex-shrink-0">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <h3 className="font-bold text-sm tracking-tight">{item.name}</h3>
                                        <p className="text-xs text-brand-gold font-medium mt-1 uppercase tracking-widest">{formatPrice(item.price)}</p>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center border border-slate-100">
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1"><Minus className="w-3 h-3" /></button>
                                            <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                                            <button onClick={() => handleIncrement(item.id, item.quantity)} className="p-1"><Plus className="w-3 h-3" /></button>
                                        </div>
                                        <button onClick={() => removeCartItem(item.id)} className="text-[10px] text-red-500 font-bold uppercase tracking-widest hover:underline">Eliminar</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer con subtotal y botón - SIEMPRE fijo abajo */}
                {$cartItems.length > 0 && (
                    <div className="flex-shrink-0 px-6 py-5 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Subtotal</span>
                            <span className="text-xl font-serif font-bold italic">{formatPrice($cartTotal)}</span>
                        </div>

                        {!isLoading && !isAuthenticated && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-center">
                                <p className="text-xs text-amber-700">
                                    <LogIn className="w-4 h-4 inline mr-1" />
                                    Inicia sesión para completar tu compra
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleCheckout}
                            className="w-full bg-brand-navy text-white py-4 font-bold tracking-[0.2em] uppercase text-sm hover:bg-black transition-all flex items-center justify-center space-x-2"
                        >
                            {!isAuthenticated ? (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    <span>Iniciar Sesión para Comprar</span>
                                </>
                            ) : (
                                <span>Tramitar Pedido</span>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
