# Configuración de AfterShip - Sistema de Seguimiento de Pedidos

## Índice
1. [Requisitos Previos](#requisitos-previos)
2. [Pasos de Configuración en AfterShip](#pasos-de-configuración-en-aftership)
3. [Configuración en el Proyecto](#configuración-en-el-proyecto)
4. [Testing y Pruebas](#testing-y-pruebas)
5. [Números de Tracking de Prueba](#números-de-tracking-de-prueba)
6. [Producción vs Pruebas](#producción-vs-pruebas)
7. [Solución de Problemas](#solución-de-problemas)

---

## Requisitos Previos

### Cuenta de AfterShip
1. **Crear cuenta gratuita** en [AfterShip](https://www.aftership.com/)
2. El plan gratuito permite hasta 50 envíos/mes (suficiente para pruebas)
3. Para producción, considera los planes de pago según tu volumen

### Información necesaria para la implementación
- [ ] Slug de AfterShip (nombre único de tu cuenta)
- [ ] URL de tracking personalizada (opcional, para marca blanca)

---

## Pasos de Configuración en AfterShip

### Paso 1: Crear cuenta
1. Ve a https://accounts.aftership.com/signup
2. Completa el registro con tu email
3. Verifica tu cuenta

### Paso 2: Configurar tu marca
1. En el panel de AfterShip, ve a **Settings** > **Organization**
2. Configura el nombre de tu empresa: `FashionMarket`
3. Sube tu logo (opcional pero recomendado)

### Paso 3: Obtener tu Slug de tracking
1. Ve a **Tracking** > **Tracking Pages**
2. Tu URL de tracking será: `https://TU-SLUG.aftership.com`
3. **Anota tu slug** - lo necesitarás para la configuración

### Paso 4: Personalizar la página de tracking (opcional)
1. En **Tracking Pages** > **Customize**
2. Ajusta colores para que coincidan con FashionMarket:
   - Color primario: `#0F172A` (Navy)
   - Color secundario: `#B59410` (Gold)
3. Configura el idioma a Español

### Paso 5: Configurar transportistas
1. Ve a **Settings** > **Carriers**
2. Activa los transportistas que utilizas (ej: Correos, SEUR, MRW, DHL, UPS, etc.)

### Paso 6: Crear API Key (opcional, para funciones avanzadas)
1. Ve a **Settings** > **API Keys**
2. Crea una nueva API Key
3. Guárdala de forma segura (no la compartas públicamente)

---

## Configuración en el Proyecto

### Archivo a modificar
`src/pages/seguimiento.astro`

### Cambiar la URL de AfterShip

Localiza esta línea (aproximadamente línea 18):

```astro
// CONFIGURACIÓN: Reemplaza con tu slug de AfterShip
const AFTERSHIP_SLUG = 'TU-SLUG-AFTERSHIP';
```

**Reemplaza `TU-SLUG-AFTERSHIP`** con tu slug real. Por ejemplo:

```astro
const AFTERSHIP_SLUG = 'fashionmarket';
```

Esto generará la URL: `https://fashionmarket.aftership.com`

### Verificar la integración
1. Ejecuta el proyecto: `npm run dev`
2. Navega a `http://localhost:4321/seguimiento`
3. Verifica que el iframe carga correctamente

---

## Testing y Pruebas

### Modo Sandbox de AfterShip
AfterShip no tiene un modo sandbox tradicional, pero puedes:

1. **Crear shipments de prueba** manualmente en el panel
2. **Usar números de tracking reales** de envíos de prueba
3. **Usar los números de tracking de demo** de AfterShip

### Crear un envío de prueba
1. En el panel de AfterShip, ve a **Shipments** > **Add Shipment**
2. Selecciona un transportista
3. Introduce un número de tracking (puede ser ficticio para pruebas iniciales)
4. Configura el estado manualmente si es necesario

---

## Números de Tracking de Prueba

### Números genéricos para testing
Estos números funcionan con el transportista "Demo Courier" en AfterShip:

| Número de Tracking | Estado Simulado |
|-------------------|-----------------|
| `1234567890` | En tránsito |
| `DEMO123456` | Entregado |
| `TEST987654` | Pendiente |

### Números de tracking reales para pruebas
Para pruebas más realistas, usa estos transportistas con formatos válidos:

| Transportista | Formato de ejemplo |
|--------------|-------------------|
| DHL Express | `1234567890` (10 dígitos) |
| UPS | `1Z999AA10123456784` |
| FedEx | `794644790126` (12 dígitos) |
| Correos (España) | `PQ1234567890ES` |

### Probar estados específicos
En el panel de AfterShip, puedes editar manualmente el estado de un envío para simular:
- **Info Received**: Información recibida
- **In Transit**: En tránsito
- **Out for Delivery**: En reparto
- **Delivered**: Entregado
- **Exception**: Incidencia
- **Failed Attempt**: Intento fallido

---

## Producción vs Pruebas

### ¿Qué está listo para producción?

| Componente | Estado | Notas |
|-----------|--------|-------|
| Página `/seguimiento` | ✅ Listo | Solo requiere configurar el slug |
| Diseño responsive | ✅ Listo | Probado en móvil y desktop |
| Integración iframe | ✅ Listo | Compatible con AfterShip |
| Formulario de búsqueda | ✅ Listo | Funcional |

### ¿Qué es solo para pruebas?

| Componente | Estado | Notas |
|-----------|--------|-------|
| Slug `TU-SLUG-AFTERSHIP` | ⚠️ Placeholder | Debe reemplazarse |
| Números de tracking demo | ⚠️ Solo testing | No funcionan en producción |

### Checklist antes de producción

- [ ] Reemplazar `TU-SLUG-AFTERSHIP` con tu slug real
- [ ] Verificar que el iframe carga correctamente
- [ ] Probar en diferentes navegadores
- [ ] Probar en dispositivos móviles
- [ ] Configurar transportistas reales en AfterShip
- [ ] (Opcional) Personalizar colores en AfterShip para coincidir con la marca

---

## Solución de Problemas

### El iframe no carga
1. Verifica que el slug es correcto
2. Comprueba que tu cuenta de AfterShip está activa
3. Revisa la consola del navegador por errores CORS

### El número de tracking no se encuentra
1. Asegúrate de que el envío existe en AfterShip
2. Verifica que el transportista está configurado
3. El tracking puede tardar unos minutos en sincronizar

### La página se ve diferente al diseño
1. AfterShip tiene su propio estilo dentro del iframe
2. Personaliza los colores desde el panel de AfterShip
3. El contenedor exterior sí puede personalizarse en el CSS del proyecto

### Error de CORS o bloqueo de iframe
Algunos navegadores o extensiones pueden bloquear iframes. Soluciones:
1. Verificar que la URL es HTTPS
2. Desactivar extensiones de bloqueo de ads/scripts
3. Considerar usar la API de AfterShip en lugar del iframe (requiere backend)

---

## Recursos Adicionales

- [Documentación oficial de AfterShip](https://www.aftership.com/docs)
- [API Reference](https://www.aftership.com/docs/tracking/api)
- [Lista de transportistas soportados](https://www.aftership.com/couriers)

---

## Contacto y Soporte

Para problemas con AfterShip:
- Soporte AfterShip: support@aftership.com
- Documentación: https://help.aftership.com

Para problemas con la integración en FashionMarket:
- Revisar este documento
- Contactar al desarrollador
