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
    compact?: boolean;
}

const LOW_STOCK_THRESHOLD = 20;

export default function ProductDetail({
    productId,
    productName,
    productPrice,
    productImage,
    availableSizes,
    compact = false
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

    const [showSizeGuide, setShowSizeGuide] = useState(false);

    return (
        <div className="space-y-4">
            {/* Guía de Tallas Inline (se muestra cuando se hace clic) */}
            {showSizeGuide && (
                <div className="border border-gray-200 mb-4 animate-fadeIn">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <span className="text-xs font-bold uppercase tracking-widest">SIZE GUIDE</span>
                        <button
                            onClick={() => setShowSizeGuide(false)}
                            className="text-gray-400 hover:text-black text-xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-center text-xs">
                            <thead>
                                <tr className="bg-gray-100 border-b border-gray-200">
                                    <th className="py-3 px-2 text-left font-bold">Size</th>
                                    <th className="py-3 px-2 font-bold">XS</th>
                                    <th className="py-3 px-2 font-bold">S</th>
                                    <th className="py-3 px-2 font-bold">M</th>
                                    <th className="py-3 px-2 font-bold">L</th>
                                    <th className="py-3 px-2 font-bold">XL</th>
                                    <th className="py-3 px-2 font-bold">XXL</th>
                                    <th className="py-3 px-2 font-bold">XXXL</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-600">
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-2 text-left text-gray-500">UK/US/AU</td>
                                    <td className="py-3 px-2">34</td>
                                    <td className="py-3 px-2">36</td>
                                    <td className="py-3 px-2">38</td>
                                    <td className="py-3 px-2">40</td>
                                    <td className="py-3 px-2">42</td>
                                    <td className="py-3 px-2">44</td>
                                    <td className="py-3 px-2">46</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-2 text-left text-gray-500">EU/FR</td>
                                    <td className="py-3 px-2">44</td>
                                    <td className="py-3 px-2">46</td>
                                    <td className="py-3 px-2">48</td>
                                    <td className="py-3 px-2">50</td>
                                    <td className="py-3 px-2">52</td>
                                    <td className="py-3 px-2">54</td>
                                    <td className="py-3 px-2">56</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="h-1 bg-black w-full"></div>
                    </div>
                </div>
            )}

            {/* Selector de tallas */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-navy">
                        SELECCIONA TALLA
                    </h3>
                    <button
                        onClick={() => setShowSizeGuide(!showSizeGuide)}
                        className="text-[10px] text-slate-500 underline hover:text-brand-navy transition-colors uppercase tracking-wider"
                    >
                        {showSizeGuide ? 'Ocultar guía' : 'Guía de tallas'}
                    </button>
                </div>

                {loading ? (
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-14 h-10 bg-slate-50 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {sizeStock.map(({ size, stock }) => {
                            const isSelected = selectedSize === size;
                            const isOutOfStock = stock === 0;

                            return (
                                <button
                                    key={size}
                                    onClick={() => !isOutOfStock && setSelectedSize(size)}
                                    disabled={isOutOfStock}
                                    className={`
                                        relative min-w-[3.5rem] h-10 px-2 flex items-center justify-center text-xs font-medium transition-all duration-200
                                        border
                                        ${isSelected
                                            ? 'border-brand-navy bg-brand-navy text-white'
                                            : isOutOfStock
                                                ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50'
                                                : 'border-slate-300 hover:border-brand-navy text-slate-700 bg-white'
                                        }
                                    `}
                                >
                                    {size}
                                    {isOutOfStock && (
                                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                            <svg className="absolute inset-0 w-full h-full text-slate-200" preserveAspectRatio="none">
                                                <line x1="0" y1="100%" x2="100%" y2="0" stroke="currentColor" strokeWidth="1" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Minimal Stock Indicator */}
                {selectedSize && selectedSizeStock && selectedSizeStock.stock < LOW_STOCK_THRESHOLD && selectedSizeStock.stock > 0 && (
                    <p className="mt-2 text-[10px] text-amber-600 font-medium tracking-wide uppercase">
                        ¡Pocas unidades! Solo quedan {selectedSizeStock.stock}
                    </p>
                )}
            </div>

            {/* Botón de añadir al carrito */}
            <button
                onClick={handleAddToCart}
                disabled={!selectedSize || (selectedSizeStock?.stock === 0)}
                className={`
                    w-full py-4 px-6 flex items-center justify-center space-x-2
                    font-bold text-xs tracking-[0.2em] uppercase
                    transition-all duration-300
                    ${!selectedSize
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : added
                            ? 'bg-green-700 text-white'
                            : 'bg-[#B59410] text-white hover:bg-[#967d0d] shadow-lg shadow-[#B59410]/20'
                    }
                `}
            >
                {added ? (
                    <span>AÑADIDO A LA BOLSA</span>
                ) : (
                    <span>AÑADIR A LA BOLSA</span>
                )}
            </button>
        </div>
    );
}
