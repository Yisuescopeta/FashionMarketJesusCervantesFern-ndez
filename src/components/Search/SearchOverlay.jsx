import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { isSearchOpen } from '../../stores/searchStore';

const SearchOverlay = () => {
    const isOpen = useStore(isSearchOpen);
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    const onClose = () => isSearchOpen.set(false);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/search.json');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setProducts(data);
                }
            } catch (error) {
                console.error('Error al obtener productos:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && products.length === 0) {
            fetchProducts();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!searchTerm || searchTerm.trim() === '') {
            setFilteredProducts([]);
        } else {
            console.log("--- BÚSQUEDA DEBUG START ---");
            console.log("Término buscado (Raw):", searchTerm);
            const lowerCaseTerm = searchTerm.toLowerCase().trim();
            console.log("Término procesado:", lowerCaseTerm);

            if (products.length > 0) {
                console.log("Primer producto de la lista (Raw):", products[0]);
                console.log("Intentando comparar:", lowerCaseTerm, "VS", products[0]?.name);
            }

            const results = products.filter(
                (product) => {
                    // Sanitización y fallback
                    const productName = product.name || product.title || product.nombre || "";
                    const productColors = product.colors || product.color || [];

                    // Lógica A prueba de balas
                    const nameMatch = typeof productName === 'string'
                        ? productName.toLowerCase().includes(lowerCaseTerm)
                        : false;

                    // Verificamos si colors es un array (Schema lo define como text[]) o string
                    let colorMatch = false;
                    if (Array.isArray(productColors)) {
                        colorMatch = productColors.some(c => typeof c === 'string' && c.toLowerCase().includes(lowerCaseTerm));
                    } else if (typeof productColors === 'string') {
                        colorMatch = productColors.toLowerCase().includes(lowerCaseTerm);
                    }

                    return nameMatch || colorMatch;
                }
            );
            console.log("Resultados encontrados:", results.length);
            console.log("--- BÚSQUEDA DEBUG END ---");
            setFilteredProducts(results);
        }
    }, [searchTerm, products]);

    const formatPrice = (amount) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount / 100);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex h-screen w-screen justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Slide-over Panel (Right Side - 50% width) */}
            <div className="relative z-10 flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 md:w-1/2 lg:w-[45vw]">

                {/* Header / Search Input */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6">
                    <input
                        type="text"
                        placeholder="BUSCAR PRODUCTOS..."
                        className="w-full text-2xl font-light uppercase tracking-wide placeholder-gray-300 focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                    <button onClick={onClose} className="ml-6 p-2 text-gray-400 hover:text-black hover:rotate-90 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto px-8 pb-12">
                    {loading ? (
                        <div className="mt-20 text-center text-gray-400 animate-pulse">
                            <p className="text-sm uppercase tracking-widest">Cargando Catálogo...</p>
                        </div>
                    ) : searchTerm === '' ? (
                        <div className="mt-12">
                            <h3 className="mb-6 text-xs font-bold tracking-widest text-gray-400">TENDENCIAS</h3>
                            <div className="flex flex-wrap gap-3">
                                {['Verano', 'Lino', 'Accesorios', 'Novedades'].map((term) => (
                                    <button
                                        key={term}
                                        onClick={() => setSearchTerm(term)}
                                        className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium uppercase tracking-wide hover:border-black hover:bg-black hover:text-white transition-all"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        <div className="mt-8 grid grid-cols-1 gap-6">
                            {filteredProducts.map((product) => (
                                <a href={`/productos/${product.slug}`} key={product.id} className="group flex items-start gap-4 border-b border-gray-50 pb-6 transition-colors hover:bg-gray-50/50 p-2 rounded-lg">
                                    <div className="h-24 w-20 flex-shrink-0 overflow-hidden bg-gray-100">
                                        <img
                                            src={(product.images && product.images[0]) || 'https://via.placeholder.com/300x400'}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>
                                    <div className="flex flex-1 flex-col justify-between h-24 py-1">
                                        <div>
                                            <h4 className="font-medium uppercase tracking-tight text-gray-900 group-hover:text-black">{product.name}</h4>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            {product.is_on_sale && product.sale_price ? (
                                                <>
                                                    <span className="text-xs text-gray-400 line-through">
                                                        {formatPrice(product.price)}
                                                    </span>
                                                    <span className="text-sm font-bold text-red-600">
                                                        {formatPrice(product.sale_price)}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {formatPrice(product.price)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-20 text-center text-gray-400">
                            <p className="text-lg font-light">No se encontraron productos para "{searchTerm}"</p>
                        </div>
                    )}
                </div>

                {/* Footer Link / Help */}
                <div className="border-t border-gray-100 bg-gray-50 px-8 py-4 text-center">
                    <a href="/catalogo" className="text-xs font-bold tracking-widest text-gray-500 hover:text-black uppercase">
                        Ver todo el catálogo
                    </a>
                </div>
            </div>
        </div>
    );
};

export default SearchOverlay;
