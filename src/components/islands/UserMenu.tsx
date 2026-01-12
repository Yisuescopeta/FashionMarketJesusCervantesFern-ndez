import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User, LogIn, LogOut, LayoutDashboard, UserCircle } from 'lucide-react';

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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
            checkAdminRole(user.id);
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

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                    </button>
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
