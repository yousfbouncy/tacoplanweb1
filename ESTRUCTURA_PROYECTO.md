# Estructura Completa del Proyecto Tacoplan

## Resumen del Proyecto

Web oficial de Tacoplan desarrollada con Next.js 13 (App Router) y Supabase, preparada para ser la landing page oficial de la app móvil en Google Play.

## Páginas Implementadas

### 1. Página Principal (/)
**Archivo**: `app/page.tsx`

Contenido SEO optimizado con palabras clave:
- Hero section con llamadas a la acción
- Sección "¿Qué es Tacoplan?"
- Sección "Cómo funciona"
- Beneficios detallados:
  - Control de jornada
  - Gestión de rutas y viajes
  - Cálculo de dietas
  - Registro de conducción
  - Uso offline y sincronización
  - App para transporte profesional

### 2. Registro (/registro)
**Archivo**: `app/registro/page.tsx`

Características:
- Registro con email y contraseña
- Registro con Google OAuth
- Validación de formularios
- Creación automática de:
  - Perfil de usuario en tabla `profiles`
  - Configuración de dietas en tabla `dietas_config`
- Redirección tras registro exitoso

### 3. Login (/login)
**Archivo**: `app/login/page.tsx`

Características:
- Login con email y contraseña
- Login con Google OAuth
- Gestión de sesión
- Manejo de errores
- Redirección tras login exitoso

### 4. Planes (/planes)
**Archivo**: `app/planes/page.tsx`

Contenido:
- **Plan Básico** (Gratis):
  - Registro de jornada
  - Control de conducción
  - Registro de descansos
  - Gestión básica de viajes
  - Cálculo de dietas
  - Uso offline

- **Plan Pro** (9,99€/mes):
  - Todo del Plan Básico
  - Informes avanzados
  - Exportación PDF/Excel
  - Rutas internacionales avanzadas
  - Soporte prioritario
  - Múltiples dispositivos
  - Sin publicidad

- FAQ sobre planes
- Preparado para integración con Stripe (solo UI)

### 5. Contacto (/contacto)
**Archivo**: `app/contacto/page.tsx`

Elementos:
- Email visible: soporte@tacoplan.es
- Formulario de contacto funcional
- Información de horario de atención
- Tiempo de respuesta estimado
- Cards informativas

### 6. Soporte (/soporte)
**Archivo**: `app/soporte/page.tsx`

Contenido:
- Centro de ayuda completo
- 10 preguntas frecuentes con respuestas detalladas:
  - Cómo empezar
  - Registro de jornada
  - Uso offline
  - Cálculo de dietas
  - Cumplimiento normativa
  - Rutas internacionales
  - Exportación de datos
  - Seguridad de datos
  - Cancelación de suscripción
  - Reporte de problemas
- Enlaces a contacto

### 7. Política de Privacidad (/politica-privacidad)
**Archivo**: `app/politica-privacidad/page.tsx`

Requisito obligatorio de Google Play. Incluye:
- Introducción y aceptación
- Datos recopilados (cuenta, uso, técnicos)
- Uso de datos
- Almacenamiento en Supabase
- Política de no venta a terceros
- Derechos del usuario (RGPD)
- Seguridad y cifrado
- Retención de datos
- Cookies
- Menores de edad
- Contacto: soporte@tacoplan.es
- Jurisdicción española y europea

### 8. Términos y Condiciones (/terminos-condiciones)
**Archivo**: `app/terminos-condiciones/page.tsx`

Contenido legal completo:
- Aceptación de términos
- Descripción del servicio
- Registro y cuenta de usuario
- Uso aceptable
- Planes y pagos (Básico y Pro)
- Propiedad intelectual
- Contenido del usuario
- Limitación de responsabilidad (normativa de transporte)
- Indemnización
- Terminación de cuenta
- Modificaciones
- Ley aplicable
- Contacto

### 9. Eliminar Cuenta (/eliminar-cuenta)
**Archivo**: `app/eliminar-cuenta/page.tsx`

Requisito obligatorio de Google Play:
- Información sobre datos eliminados
- Advertencia de irreversibilidad
- Proceso de eliminación:
  - Solo para usuarios autenticados
  - Confirmación doble
  - Eliminación de perfil y datos
  - Cierre de sesión automático
- Alternativas antes de eliminar
- Contacto con soporte
- Política de eliminación de datos (RGPD)

## Componentes

### Navbar
**Archivo**: `components/navbar.tsx`

Características:
- Logo de Tacoplan
- Enlaces principales (Inicio, Planes, Contacto, Soporte)
- Estado de autenticación
- Botones Login/Registro (si no autenticado)
- Botón Cerrar Sesión (si autenticado)
- Menú móvil responsive

### Footer
**Archivo**: `components/footer.tsx`

Contenido:
- Logo y descripción
- 4 columnas:
  - Producto (Inicio, Planes, Soporte)
  - Soporte (Contacto, Ayuda, Email)
  - Legal (Privacidad, Términos, Eliminar cuenta)
- Copyright con nombre del desarrollador (Youssef)
- Responsive

## Infraestructura

### Base de Datos Supabase

#### Tabla: profiles
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  email text NOT NULL,
  plan text DEFAULT 'basico' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

Políticas RLS:
- SELECT: usuarios ven solo su perfil
- INSERT: usuarios crean solo su perfil
- UPDATE: usuarios actualizan solo su perfil
- DELETE: usuarios eliminan solo su perfil

#### Tabla: dietas_config
```sql
CREATE TABLE dietas_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dieta_nacional numeric DEFAULT 28.0 NOT NULL,
  dieta_internacional numeric DEFAULT 53.0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);
```

Políticas RLS:
- SELECT: usuarios ven solo su configuración
- INSERT: usuarios crean solo su configuración
- UPDATE: usuarios actualizan solo su configuración
- DELETE: usuarios eliminan solo su configuración

### Autenticación

**Archivo**: `lib/auth-context.tsx`

Context de React que provee:
- Usuario actual
- Estado de carga
- Función signOut
- Manejo de sesión con Supabase
- Listener de cambios de autenticación

**Archivo**: `lib/supabase.ts`

Cliente singleton de Supabase configurado con:
- URL del proyecto
- Anon key pública
- Reutilización en toda la app

### Layout Principal

**Archivo**: `app/layout.tsx`

Características:
- Metadatos SEO completos
- Keywords optimizadas
- Open Graph
- Twitter Cards
- AuthProvider global
- Navbar persistente
- Footer persistente
- Estructura flex para sticky footer

## SEO y Optimización

### Keywords Principales
```
app camioneros, control tacógrafo, registro jornada conductor,
tiempos de conducción, descansos camion, app transporte,
gestión rutas camión, dietas camioneros, control horas conducción,
logística transporte, app para transportistas, tacógrafo digital,
registro viajes camión
```

### Metadatos por Página
- Home: Título y descripción optimizados
- Planes: Keywords de precios y funcionalidades
- Soporte: Keywords de ayuda y FAQs
- Todas las páginas legales tienen metadatos apropiados

## Tecnologías Utilizadas

- **Next.js 13.5.1** - Framework React con App Router
- **React 18.2.0** - Librería UI
- **TypeScript 5.2.2** - Type safety
- **Supabase JS 2.58.0** - Backend as a Service
- **Tailwind CSS 3.3.3** - Estilos utility-first
- **shadcn/ui** - Componentes UI accesibles
- **Lucide React** - Iconos
- **React Hook Form** - Gestión de formularios
- **Zod** - Validación de esquemas

## Cumplimiento Google Play

✅ Política de Privacidad pública y accesible
✅ Términos y Condiciones
✅ Página de eliminación de cuenta
✅ Información de contacto clara
✅ Datos del desarrollador visibles
✅ Email de soporte: soporte@tacoplan.es
✅ Cumplimiento RGPD
✅ RLS habilitado en todas las tablas

## Próximos Pasos

1. **Integración de Stripe**
   - Configurar productos en Stripe
   - Implementar checkout
   - Webhooks para gestión de suscripciones

2. **Deploy**
   - Configurar dominio personalizado
   - Configurar variables de entorno en Vercel
   - Actualizar URLs de redirección en Supabase

3. **Google Play**
   - Agregar URL de la web en la ficha de Google Play
   - Enlazar política de privacidad
   - Configurar datos de contacto

4. **Marketing**
   - Google Search Console
   - Google Analytics
   - Mejoras de SEO adicionales

## Archivos de Configuración

- `.env.example` - Plantilla de variables de entorno
- `next.config.js` - Configuración de Next.js
- `tailwind.config.ts` - Configuración de Tailwind
- `tsconfig.json` - Configuración de TypeScript
- `package.json` - Dependencias y scripts

## Scripts Disponibles

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción
npm run start     # Servidor de producción
npm run lint      # Linter
npm run typecheck # Verificación de tipos
```

## Seguridad

- RLS habilitado en todas las tablas
- Políticas restrictivas por defecto
- Autenticación con JWT
- Datos cifrados en tránsito y reposo
- No exposición de claves secretas
- Validación en cliente y servidor

## Responsive Design

Breakpoints implementados:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

Todas las páginas son completamente responsive con:
- Menú móvil funcional
- Grids adaptables
- Tipografía escalable
- Imágenes optimizadas
