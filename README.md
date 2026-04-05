# Tacoplan - App para Camioneros

Web oficial de Tacoplan, la aplicación profesional para conductores de camión y tráiler que permite el control completo de jornada laboral, registro de conducción, gestión de rutas y cálculo de dietas.

## Características Principales

- Control de jornada laboral
- Registro de tiempos de conducción y descanso
- Gestión de rutas nacionales e internacionales
- Cálculo automático de dietas
- Autenticación completa (email/password y Google)
- Preparado para suscripciones (Stripe)
- Cumplimiento con requisitos de Google Play

## Tecnologías

- **Next.js 13** (App Router)
- **Supabase** (Auth + Database)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Lucide Icons**

## Estructura del Proyecto

```
tacoplan/
├── app/
│   ├── page.tsx                    # Página de inicio
│   ├── registro/page.tsx           # Registro de usuarios
│   ├── login/page.tsx              # Inicio de sesión
│   ├── planes/page.tsx             # Planes y precios
│   ├── contacto/page.tsx           # Formulario de contacto
│   ├── soporte/page.tsx            # Centro de ayuda
│   ├── politica-privacidad/page.tsx # Política de privacidad (Google Play)
│   ├── terminos-condiciones/page.tsx # Términos y condiciones
│   ├── eliminar-cuenta/page.tsx    # Eliminación de cuenta (Google Play)
│   ├── layout.tsx                  # Layout principal
│   └── globals.css                 # Estilos globales
├── components/
│   ├── navbar.tsx                  # Navegación principal
│   ├── footer.tsx                  # Footer con enlaces legales
│   └── ui/                         # Componentes de shadcn/ui
├── lib/
│   ├── supabase.ts                 # Cliente de Supabase
│   └── auth-context.tsx            # Contexto de autenticación
└── .env.example                    # Variables de entorno de ejemplo
```

## Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

## Base de Datos

El proyecto incluye las siguientes tablas en Supabase:

### profiles
- `id` (uuid) - Referencia a auth.users
- `nombre` (text)
- `email` (text)
- `plan` (text) - 'basico' o 'pro'
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### dietas_config
- `id` (uuid)
- `user_id` (uuid) - Referencia a auth.users
- `dieta_nacional` (numeric) - Default: 28.0
- `dieta_internacional` (numeric) - Default: 53.0
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Todas las tablas tienen RLS (Row Level Security) habilitado con políticas apropiadas.

## Instalación y Desarrollo

1. Clonar el repositorio
2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno (.env.local)

4. Ejecutar el servidor de desarrollo:
```bash
npm run dev
```

5. Abrir [http://localhost:3000](http://localhost:3000)

## Build para Producción

```bash
npm run build
```

## Despliegue en Vercel

1. Conectar el repositorio a Vercel
2. Configurar las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Desplegar

## Páginas Obligatorias para Google Play

El proyecto incluye todas las páginas requeridas por Google Play:

- ✅ Política de Privacidad (`/politica-privacidad`)
- ✅ Términos y Condiciones (`/terminos-condiciones`)
- ✅ Eliminación de Cuenta (`/eliminar-cuenta`)
- ✅ Página de Contacto (`/contacto`)

## SEO

La web está optimizada para SEO con:

- Palabras clave relacionadas con transporte y camioneros
- Metadatos apropiados en cada página
- Estructura semántica HTML
- Open Graph y Twitter Cards
- URLs descriptivas

## Contacto

- **Desarrollador**: Youssef
- **Email**: soporte@tacoplan.es

## Licencia

Todos los derechos reservados - Tacoplan © 2024
