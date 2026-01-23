import { useState, useEffect } from 'react';
import { ShoppingBag, AlertTriangle, Check } from 'lucide-react';
import { addCartItem, cartItems } from '../../stores/cart';
import { supabase } from '../../lib/supabase';

interface SizeStock {
    size: string;
    stock: number;
}

interface Props {
    productId: string;
    productName: string;
    productPrice: number;
    productImage: string;
    availableSizes: string[];
}

const LOW_STOCK_THRESHOLD = 20;

export default function ProductDetail({
    productId,
    productName,
    productPrice,
    productImage,
    availableSizes
}: Props) {
    const [sizeStock, setSizeStock] = useState<SizeStock[]>([]);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        loadSizeStock();
    }, [productId]);

    const loadSizeStock = async () => {
        setLoading(true);

        // Obtener stock por talla desde el campo 'sizes' de la tabla products
        const { data, error } = await supabase
            .from('products')
            .select('sizes, stock')
            .eq('id', productId)
            .single();

        if (data && data.sizes) {
            // Check if sizes is an object (new format with stock per size)
            if (typeof data.sizes === 'object' && !Array.isArray(data.sizes)) {
                // data.sizes es un objeto como { "S": 10, "M": 20, "L": 15 }
                const sizesObj = data.sizes as Record<string, number>;
                const stockArray = Object.entries(sizesObj).map(([size, stock]) => ({
                    size,
                    stock: Number(stock)
                }));

                // Ordenar tallas
                const sortedData = stockArray.sort((a, b) => {
                    const order: { [key: string]: number } = {
                        'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6,
                        '28': 7, '30': 8, '32': 9, '34': 10, '36': 11, '38': 12, '40': 13
                    };
                    return (order[a.size] || 99) - (order[b.size] || 99);
                });
                setSizeStock(sortedData);
            } else if (Array.isArray(data.sizes)) {
                // Legacy format: sizes is an array like ["S", "M", "L"]
                // Distribute total stock evenly among sizes
                const sizesArr = data.sizes as string[];
                const totalStock = data.stock || 50;
                const stockPerSize = Math.floor(totalStock / sizesArr.length);

                const stockArray = sizesArr.map(size => ({
                    size: String(size),
                    stock: stockPerSize
                }));

                // Ordenar tallas
                const sortedData = stockArray.sort((a, b) => {
                    const order: { [key: string]: number } = {
                        'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6,
                        '28': 7, '30': 8, '32': 9, '34': 10, '36': 11, '38': 12, '40': 13
                    };
                    return (order[a.size] || 99) - (order[b.size] || 99);
                });
                setSizeStock(sortedData);
            }
        } else if (availableSizes && availableSizes.length > 0) {
            // Fallback: usar las tallas disponibles del prop
            const fallbackStock = (Array.isArray(availableSizes) ? availableSizes : []).map(size => ({
                size: String(size),
                stock: 10 // Stock por defecto
            }));
            setSizeStock(fallbackStock);
        }

        setLoading(false);
    };

    // Obtener cantidad actual en el carrito para este producto+talla
    const getCartQuantity = (size: string): number => {
        const cart = cartItems.get();
        const cartItem = cart.find(item => item.id === `${productId}-${size}`);
        return cartItem?.quantity || 0;
    };

    const handleAddToCart = () => {
        if (!selectedSize) return;

        const sizeInfo = sizeStock.find(s => s.size === selectedSize);
        if (!sizeInfo || sizeInfo.stock === 0) return;

        // Verificar que no exceda el stock disponible
        const currentInCart = getCartQuantity(selectedSize);
        if (currentInCart >= sizeInfo.stock) {
            // Ya tiene el máximo en carrito
            alert(`No puedes añadir más. Solo hay ${sizeInfo.stock} unidades disponibles y ya tienes ${currentInCart} en tu carrito.`);
            return;
        }

        addCartItem({
            id: `${productId}-${selectedSize}`,
            name: `${productName} - Talla ${selectedSize}`,
            price: productPrice,
            image: productImage,
            size: selectedSize
        });

        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    const getStockStatus = (stock: number) => {
        if (stock === 0) return { text: 'Agotado', color: 'text-red-500', bg: 'bg-red-50' };
        if (stock < LOW_STOCK_THRESHOLD) return { text: `¡Solo ${stock} uds!`, color: 'text-amber-600', bg: 'bg-amber-50' };
        return { text: 'Disponible', color: 'text-green-600', bg: 'bg-green-50' };
    };

    const selectedSizeStock = sizeStock.find(s => s.size === selectedSize);
    const isLowStock = selectedSizeStock && selectedSizeStock.stock > 0 && selectedSizeStock.stock < LOW_STOCK_THRESHOLD;

    return (
        <div className="space-y-8">
            {/* Selector de tallas */}
            <div>
                <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500 mb-4">
                    Selecciona tu talla
                </h3>

                {loading ? (
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-14 h-14 bg-slate-100 animate-pulse rounded" />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {sizeStock.map(({ size, stock }) => {
                            const isSelected = selectedSize === size;
                            const isOutOfStock = stock === 0;
                            const isLow = stock > 0 && stock < LOW_STOCK_THRESHOLD;

                            return (
                                <button
                                    key={size}
                                    onClick={() => !isOutOfStock && setSelectedSize(size)}
                                    disabled={isOutOfStock}
                                    className={`
                                        relative min-w-[3.5rem] h-14 px-3 border-2 font-bold text-sm
                                        transition-all duration-200
                                        ${isSelected
                                            ? 'border-brand-navy bg-brand-navy text-white'
                                            : isOutOfStock
                                                ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                                                : 'border-slate-200 hover:border-brand-navy text-slate-700'
                                        }
                                    `}
                                >
                                    {size}
                                    {/* Indicador de stock bajo */}
                                    {isLow && !isSelected && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Información de stock de la talla seleccionada */}
            {selectedSize && selectedSizeStock && (
                <div className={`p-4 rounded-lg ${isLowStock ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center gap-2">
                        {isLowStock ? (
                            <>
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                <span className="text-amber-800 font-medium">
                                    ¡Últimas unidades! Solo quedan {selectedSizeStock.stock} en talla {selectedSize}
                                </span>
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5 text-green-600" />
                                <span className="text-green-800 font-medium">
                                    Disponible en talla {selectedSize} ({selectedSizeStock.stock} uds)
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Botón de añadir al carrito */}
            <button
                onClick={handleAddToCart}
                disabled={!selectedSize || (selectedSizeStock?.stock === 0)}
                className={`
                    w-full px-8 py-5 flex items-center justify-center space-x-3 
                    font-bold tracking-[0.2em] uppercase text-xs 
                    transition-all duration-300 group shadow-lg
                    ${!selectedSize
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : added
                            ? 'bg-green-600 text-white'
                            : 'bg-brand-navy text-white hover:bg-black shadow-navy-900/10'
                    }
                `}
            >
                {added ? (
                    <>
                        <Check className="w-5 h-5" />
                        <span>¡Añadido!</span>
                    </>
                ) : (
                    <>
                        <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>{selectedSize ? 'Añadir a la Selección' : 'Selecciona una talla'}</span>
                    </>
                )}
            </button>

            {/* Guía de tallas */}
            <button className="text-xs text-slate-500 underline hover:text-brand-navy transition-colors">
                Guía de tallas
            </button>
        </div>
    );
}
