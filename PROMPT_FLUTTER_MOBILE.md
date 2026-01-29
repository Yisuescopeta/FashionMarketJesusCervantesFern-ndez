# PROMPT PARA DESARROLLAR VERSIÓN MÓVIL EN FLUTTER - FASHION MARKET

## DESCRIPCIÓN GENERAL DEL PROYECTO

Crear una aplicación móvil nativa en Flutter para una tienda de moda masculina llamada "Aurum" (Fashion Market). La app debe replicar todas las funcionalidades de la versión web actual, optimizadas para experiencia móvil.

## CARACTERÍSTICAS PRINCIPALES REQUERIDAS

### 1. ARQUITECTURA Y ESTADO
- **Arquitectura**: Clean Architecture con separación clara de capas (presentation, domain, data)
- **Gestión de Estado**: Provider o Riverpod para manejo de estado global
- **Persistencia Local**: Hive o SharedPreferences para carrito y preferencias
- **Navegación**: Go Router para navegación declarativa y routing

### 2. AUTENTICACIÓN Y USUARIOS
- Sistema de autenticación con email/contraseña
- Integración con Supabase Auth
- Roles de usuario (customer, admin)
- Perfil de usuario con historial de pedidos
- Sistema de favoritos

### 3. CATÁLOGO DE PRODUCTOS
- Listado de productos con grid optimizado para móvil
- Filtros avanzados (categoría, precio, tallas, ofertas)
- Búsqueda de productos con suggestions
- Detalle de producto con galería de imágenes zoomable
- Sistema de tallas y stock en tiempo real
- Productos en oferta con descuentos visibles

### 4. CARRITO DE COMPRAS
- Carrito persistente localmente
- Gestión de cantidades y tallas
- Validación de stock en tiempo real
- Cálculo automático de totales
- Integración con descuentos y envío

### 5. PROCESO DE CHECKOUT
- Formulario de envío optimizado para móvil
- Integración con Stripe para pagos
- Múltiples métodos de pago guardados
- Resumen del pedido antes de confirmar
- Confirmación de pedido con número de seguimiento

### 6. GESTIÓN DE PEDIDOS
- Historial de pedidos del usuario
- Seguimiento de pedidos en tiempo real
- Estados del pedido (pendiente, pagado, enviado, entregado)
- Detalles completos del pedido

### 7. NOTIFICACIONES PUSH
- Notificaciones de cambios en estado del pedido
- Alertas de productos en oferta
- Notificaciones de favoritos en venta
- Confirmaciones de pago y envío

### 8. PANEL DE ADMINISTRACIÓN (MÓVIL)
- Gestión de productos (CRUD)
- Gestión de pedidos
- Gestión de categorías
- Estadísticas básicas de ventas
- Sistema de notificaciones push

## ESTRUCTURA DE BASE DE DATOS (SUPABASE)

### Tablas Principales:
- **users**: Perfiles de usuario con rol
- **categories**: Categorías de productos
- **products**: Productos con imágenes, precios, tallas, stock
- **orders**: Pedidos con estado y seguimiento
- **order_items**: Items de cada pedido
- **favorites**: Productos favoritos por usuario
- **site_settings**: Configuración de la app

## DISEÑO Y UI/UX

### Sistema de Diseño:
- **Tema Principal**: Azul marino (#1a1a2e) con dorado (#d4af37)
- **Tipografía**: Serif para títulos, sans-serif para cuerpo
- **Iconografía**: Lucide Icons o similar
- **Animaciones**: Transiciones suaves y micro-interacciones

### Pantallas Principales:
1. **Splash Screen** con branding de Aurum
2. **Onboarding** para nuevos usuarios
3. **Home** con hero, ofertas, novedades, categorías
4. **Catálogo** con filtros y búsqueda
5. **Detalle Producto** con galería y variantes
6. **Carrito** con gestión de items
7. **Checkout** con formulario de envío y pago
8. **Perfil** con datos y pedidos
9. **Favoritos** con wishlist
10. **Admin Panel** con gestión completa

## VARIABLES DE ENTORNO (.env)

```env
PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
PUBLIC_STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
PUBLIC_CLOUDINARY_CLOUD_NAME=YOUR_CLOUDINARY_CLOUD_NAME
PUBLIC_CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET
EMAIL_USER=YOUR_EMAIL
EMAIL_PASSWORD=YOUR_EMAIL_APP_PASSWORD

# URL del sitio en producción - CAMBIAR por tu dominio de Coolify
SITE_URL=https://s4k40owsc0w8wk8ggw4ocwkk.victoriafp.online
```

## PAQUETES FLUTTER RECOMENDADOS

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Estado y arquitectura
  flutter_riverpod: ^2.4.9
  go_router: ^12.1.3
  
  # Supabase y backend
  supabase_flutter: ^2.3.4
  supabase_auth_helpers: ^0.1.0
  
  # Stripe y pagos
  flutter_stripe: ^10.1.0
  
  # Firebase y notificaciones
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.10
  flutter_local_notifications: ^16.3.0
  
  # UI y componentes
  cached_network_image: ^3.3.0
  photo_view: ^0.14.0
  shimmer: ^3.0.0
  lottie: ^2.7.0
  flutter_svg: ^2.0.9
  
  # Utilidades
  intl: ^0.19.0
  shared_preferences: ^2.2.2
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  url_launcher: ^6.2.2
  image_picker: ^1.0.4
  
  # Formularios y validación
  flutter_form_builder: ^9.1.1
  form_builder_validators: ^10.0.1
  
  # Gráficos y estadísticas (admin)
  fl_chart: ^0.66.0
  
  # Testing y desarrollo
  flutter_lints: ^3.0.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  hive_generator: ^2.0.1
  build_runner: ^2.4.7
  mockito: ^5.4.4
  integration_test:
    sdk: flutter
```

## REQUISITOS TÉCNICOS ESPECÍFICOS

### 1. PERFORMANCE
- Lazy loading para imágenes y productos
- Paginación infinita en catálogos
- Cache inteligente de imágenes
- Optimización de memoria en galerías

### 2. OFFLINE FIRST
- Carrito funcional sin conexión
- Cache de productos y categorías
- Sincronización automática al恢复 conexión
- Indicadores de estado de conexión

### 3. SEGURIDAD
- Encriptación de datos sensibles localmente
- Tokens de autenticación seguros
- Validación de inputs en cliente y servidor
- Política de privacidad clara

### 4. ACCESIBILIDAD
- Soporte para lectores de pantalla
- Contraste adecuado para texto
- Navegación por gestos
- Texto escalable

## FLUJOS DE USUARIO CRÍTICOS

### 1. Flujo de Compra
Home → Catálogo → Detalle Producto → Añadir al Carrito → Carrito → Checkout → Pago → Confirmación

### 2. Flujo de Autenticación
Login → Verificación Email → Dashboard → Perfil → Historial Pedidos

### 3. Flujo de Administración
Login Admin → Panel Admin → Gestión Productos → CRUD → Actualizar Stock → Ver Pedidos

## INTEGRACIONES EXTERNAS

1. **Supabase**: Base de datos, autenticación, storage
2. **Stripe**: Procesamiento de pagos
3. **Cloudinary**: Gestión de imágenes
4. **Firebase**: Notificaciones push
5. **Email Service**: Notificaciones transaccionales

## TESTING

### Unit Tests
- Lógica de negocio
- Validaciones de formularios
- Cálculos de precios y descuentos

### Integration Tests
- Flujos de usuario completos
- Integración con APIs externas
- Persistencia de datos

### UI Tests
- Componentes principales
- Navegación entre pantallas
- Interacciones táctiles

## DESPLIEGUE

### Android
- Compilación APK/AAB para Play Store
- Configuración de firmas
- Optimización de recursos

### iOS
- Compilación IPA para App Store
- Configuración de certificados
- Revisión de guidelines de Apple

## MÉTRICAS Y ANALÍTICA

- Google Analytics 4 para Firebase
- Seguimiento de eventos de usuario
- Monitorización de crashes
- Performance metrics

## DOCUMENTACIÓN REQUERIDA

1. **README.md** con setup y ejecución
2. **ARQUITECTURA.md** explicando estructura
3. **API.md** con endpoints y modelos
4. **DEPLOYMENT.md** guía de despliegue
5. **TESTING.md** estrategia de pruebas

## ENTREGABLES

1. Código fuente completo y documentado
2. APK de prueba para Android
3. Especificaciones para App Store
4. Manual de usuario y administrador
5. Plan de mantenimiento y actualizaciones

---

**NOTA IMPORTANTE**: Este prompt debe ser usado como guía principal para el desarrollo. Mantener comunicación constante sobre progreso y blockers. Priorizar MVP funcional con características core, luego iterar sobre funcionalidades avanzadas.
