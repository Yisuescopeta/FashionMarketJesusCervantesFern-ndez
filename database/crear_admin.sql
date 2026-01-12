-- ==========================================
-- FASHIONMARKET - CREAR USUARIO ADMINISTRADOR
-- ==========================================
-- Fecha: Enero 2026
--
-- INSTRUCCIONES:
-- Este script te permite asignar el rol de admin a un usuario existente.
-- IMPORTANTE: El usuario debe estar registrado previamente en la aplicación.
--
-- PASOS:
-- 1. El usuario debe registrarse normalmente en la web (como customer)
-- 2. Ejecuta este script reemplazando el email del usuario
-- ==========================================

-- ============================================
-- OPCIÓN 1: Asignar admin por EMAIL
-- ============================================
-- Reemplaza 'admin@fashionmarket.com' con el email del usuario que quieres hacer admin

update profiles
set role = 'admin'
where email = 'admin@fashionmarket.com';  -- <-- CAMBIA ESTE EMAIL

-- Verificar que se actualizó correctamente
select id, full_name, email, role, created_at
from profiles
where email = 'admin@fashionmarket.com';  -- <-- CAMBIA ESTE EMAIL

-- ============================================
-- OPCIÓN 2: Asignar admin por ID de usuario
-- ============================================
-- Si conoces el UUID del usuario, puedes usarlo directamente

-- update profiles
-- set role = 'admin'
-- where id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';  -- <-- CAMBIA ESTE UUID

-- ============================================
-- CONSULTAS ÚTILES
-- ============================================

-- Ver todos los administradores actuales:
-- select id, full_name, email, role, created_at from profiles where role = 'admin';

-- Ver todos los usuarios:
-- select id, full_name, email, role, created_at from profiles order by created_at desc;

-- Quitar rol de admin a un usuario (degradar a customer):
-- update profiles set role = 'customer' where email = 'email@ejemplo.com';

-- ==========================================
-- NOTAS DE SEGURIDAD
-- ==========================================
-- - Este es el ÚNICO método para crear administradores
-- - NO existe forma de hacerse admin desde la aplicación web
-- - Solo el administrador de la base de datos puede ejecutar este script
-- - Mantén un registro de qué usuarios tienen rol de admin
-- ==========================================
