import { defineMiddleware } from "astro:middleware";
import { supabase } from "./lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // ============================================
    // SEGURIDAD: Protección de Rutas de Admin
    // ============================================
    
    // IMPORTANTE: La página /admin/login NO debe ser accesible públicamente
    // Solo usuarios que YA son admin pueden acceder al panel de administración
    // La única forma de ser admin es ser asignado directamente desde la base de datos
    
    if (pathname.startsWith("/admin")) {
        const { data: { user }, error } = await supabase.auth.getUser();

        // Si no hay usuario autenticado, redirigir a login público
        // NO mostrar la página de login de admin a usuarios no autenticados
        if (error || !user) {
            // Redirigir al login público, no al de admin
            return context.redirect("/login?redirect=/admin");
        }

        // Verificar rol de admin en la tabla de perfiles
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        // Si el usuario NO es admin, redirigir a inicio
        // Esto aplica a TODAS las rutas de admin, incluyendo /admin/login
        if (profile?.role !== "admin") {
            return context.redirect("/");
        }
        
        // Usuario es admin, permitir acceso a cualquier ruta de admin
    }

    // Security Headers - Cabeceras de seguridad HTTP
    const response = await next();
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    return response;
});
