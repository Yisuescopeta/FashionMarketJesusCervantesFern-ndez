import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Crea un cliente de Supabase para uso en el servidor (SSR)
 * que puede leer las cookies de autenticación de la request
 */
export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Leer cookies de autenticación
        const accessToken = cookies.get('sb-access-token')?.value;
        const refreshToken = cookies.get('sb-refresh-token')?.value;
        
        const cookieList = [];
        if (accessToken) {
          cookieList.push({ name: 'sb-access-token', value: accessToken });
        }
        if (refreshToken) {
          cookieList.push({ name: 'sb-refresh-token', value: refreshToken });
        }
        
        return cookieList;
      },
      setAll(cookiesToSet) {
        // En SSR solo leemos cookies, no las establecemos
        // Las cookies se establecen en el cliente
      }
    }
  });
}

/**
 * Obtiene el usuario autenticado desde las cookies de la request
 * Retorna null si no hay usuario autenticado
 */
export async function getAuthenticatedUser(cookies: AstroCookies) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;
  
  if (!accessToken) {
    return null;
  }

  const supabase = createSupabaseServerClient(cookies);
  
  // Establecer la sesión con los tokens de las cookies
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    return null;
  }
  
  return user;
}
