import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  showText?: boolean;
}

export default function FavoriteButton({ productId, className = '', showText = false }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    checkFavoriteStatus();
  }, [productId]);

  // Verificar estado de favorito usando la API
  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/favorites?productId=${productId}`);
      const data = await response.json();
      
      setIsAuthenticated(data.authenticated);
      setIsFavorite(data.isFavorite);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorite) {
        // Quitar de favoritos
        const response = await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setIsFavorite(false);
        } else {
          console.error('Error:', data.error);
        }
      } else {
        // Añadir a favoritos
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setIsFavorite(true);
        } else {
          console.error('Error:', data.error);
          alert('Error al guardar favorito: ' + data.error);
        }
      }
    } catch (error) {
      console.error('Error al actualizar favorito:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggleFavorite}
        disabled={isLoading}
        className={`
          group flex items-center gap-2 p-2 rounded-full transition-all duration-300
          ${isFavorite 
            ? 'bg-red-50 text-red-500 hover:bg-red-100' 
            : 'bg-white/80 text-slate-400 hover:text-red-500 hover:bg-red-50'
          }
          ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
          backdrop-blur-sm border border-slate-100 hover:border-red-200
        `}
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      >
        <Heart 
          className={`w-5 h-5 transition-all duration-300 ${
            isFavorite 
              ? 'fill-red-500 scale-110' 
              : 'fill-transparent group-hover:scale-110'
          }`}
        />
        {showText && (
          <span className="text-sm font-medium pr-1">
            {isFavorite ? 'En favoritos' : 'Favorito'}
          </span>
        )}
      </button>

      {/* Tooltip para usuarios no autenticados */}
      {showTooltip && !isAuthenticated && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-fade-in">
          <div className="bg-brand-navy text-white text-xs px-4 py-3 rounded-lg shadow-lg whitespace-nowrap">
            <p className="font-medium mb-2">Inicia sesión para guardar favoritos</p>
            <button
              onClick={handleLoginRedirect}
              className="text-brand-gold hover:underline text-xs font-bold"
            >
              Iniciar sesión →
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-brand-navy"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
