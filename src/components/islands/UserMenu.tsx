import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User, LogIn, LogOut, LayoutDashboard, UserCircle, Heart, Settings } from 'lucide-react';

export default function UserMenu() {
    const [user, setUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        checkUser();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user);
                checkAdminRole(session.user.id);
            } else {
                setUser(null);
                setIsAdmin(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            checkAdminRole(session.user.id);
            // Guardar tokens en cookies para el servidor
            const maxAge = 60 * 60 * 24 * 7;
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
            document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }
    };

    const checkAdminRole = async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (data?.role === 'admin') {
            setIsAdmin(true);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // Limpiar cookies de autenticación
        document.cookie = 'sb-access-token=; path=/; max-age=0';
        document.cookie = 'sb-refresh-token=; path=/; max-age=0';
        window.location.href = '/';
    };

    if (!user) {
        return (
            <div className="flex items-center space-x-3">
                <a
                    href="/login"
                    className="flex items-center space-x-2 text-sm font-bold uppercase tracking-widest hover:text-brand-gold transition-colors"
                >
                    <User className="w-5 h-5" />
                    <span className="hidden md:inline">Entrar</span>
                </a>
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-full transition-colors"
            >
                <UserCircle className="w-6 h-6 text-brand-navy" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 shadow-xl rounded-lg py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-50">
                        <p className="text-sm font-bold text-brand-navy truncate">{user.email}</p>
                    </div>

                    {isAdmin && (
                        <a
                            href="/admin"
                            className="flex items-center space-x-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-navy transition-colors"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Panel Admin</span>
                        </a>
                    )}

                    <a
                        href="/mis-favoritos"
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-navy transition-colors"
                    >
                        <Heart className="w-4 h-4" />
                        <span>Mis Favoritos</span>
                    </a>

                    <a
                        href="/mi-cuenta/pedidos"
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-navy transition-colors"
                    >
                        <UserCircle className="w-4 h-4" />
                        <span>Mis Pedidos</span>
                    </a>

                    <a
                        href="/mi-cuenta/preferencias"
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-navy transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Preferencias</span>
                    </a>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            )}

            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
