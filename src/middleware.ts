import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // ============================================
    // SEGURIDAD: Protección de Rutas de Admin
    // ============================================
    
    if (pathname.startsWith("/admin")) {
        // Leer token de acceso de la cookie
        const accessToken = context.cookies.get("sb-access-token")?.value;
        
        // Si no hay token, redirigir a login
        if (!accessToken) {
            return context.redirect("/login?redirect=" + encodeURIComponent(pathname));
        }

        // Crear cliente de Supabase y verificar el token
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        });
        
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        // Si el token es inválido o expirado
        if (error || !user) {
            // Limpiar cookies inválidas
            context.cookies.delete("sb-access-token", { path: "/" });
            context.cookies.delete("sb-refresh-token", { path: "/" });
            return context.redirect("/login?redirect=" + encodeURIComponent(pathname));
        }

        // Verificar rol de admin en la tabla de perfiles
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        // Si el usuario NO es admin, redirigir a inicio
        if (profile?.role !== "admin") {
            return context.redirect("/");
        }
        
        // Usuario es admin, permitir acceso
    }

    // Security Headers
    const response = await next();
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    return response;
});
