import { useState, useEffect } from 'react';
import { ShoppingBag, AlertTriangle, Check } from 'lucide-react';
import { addCartItem } from '../../stores/cart';
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
        
        // Obtener stock por talla desde la base de datos
        const { data, error } = await supabase
            .from('product_variants')
            .select('size, stock')
            .eq('product_id', productId);

        if (data && data.length > 0) {
            // Ordenar tallas
            const sortedData = data.sort((a, b) => {
                const order: { [key: string]: number } = {
                    'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6,
                    '28': 7, '30': 8, '32': 9, '34': 10, '36': 11, '38': 12, '40': 13
                };
                return (order[a.size] || 99) - (order[b.size] || 99);
            });
            setSizeStock(sortedData);
        } else {
            // Fallback: usar las tallas disponibles con stock simulado
            const fallbackStock = availableSizes.map(size => ({
                size,
                stock: Math.floor(Math.random() * 30) + 5
            }));
            setSizeStock(fallbackStock);
        }
        
        setLoading(false);
    };

    const handleAddToCart = () => {
        if (!selectedSize) return;
        
        const sizeInfo = sizeStock.find(s => s.size === selectedSize);
        if (!sizeInfo || sizeInfo.stock === 0) return;

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
