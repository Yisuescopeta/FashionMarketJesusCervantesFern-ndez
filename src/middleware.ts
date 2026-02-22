
import { defineMiddleware } from "astro:middleware";
import { supabase } from "./lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
    const { url, redirect } = context;

    // Proteger rutas de administración
    if (url.pathname.startsWith("/admin") && !url.pathname.startsWith("/admin/login")) {
        const accessToken = context.cookies.get("sb-access-token")?.value;
        const refreshToken = context.cookies.get("sb-refresh-token")?.value;

        if (!accessToken || !refreshToken) {
            // Si no hay tokens en cookies, redirigir al login
            return redirect("/admin/login");
        }

        // Verificar validez del token en Supabase
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            // Token inválido o expirado
            return redirect("/admin/login");
        }
    }

    // Si intenta acceder al login estando ya autenticado
    if (url.pathname === "/admin/login") {
        const accessToken = context.cookies.get("sb-access-token")?.value;
        if (accessToken) {
            return redirect("/admin");
        }
    }

    return next();
});
