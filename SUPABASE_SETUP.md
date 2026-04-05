# Configuración de Supabase

## 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Guarda la URL del proyecto y la clave anónima (anon key)

## 2. Obtener Credenciales

En el dashboard de Supabase:

1. Ve a **Settings** > **API**
2. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. Configurar Google OAuth (Opcional)

Para habilitar el inicio de sesión con Google:

### Paso 1: Crear Credenciales en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** > **Credentials**
4. Click en **Create Credentials** > **OAuth 2.0 Client ID**
5. Configura la pantalla de consentimiento si es necesario
6. Tipo de aplicación: **Web application**
7. Agrega las URIs de redirección autorizadas:
   ```
   https://tu-proyecto.supabase.co/auth/v1/callback
   ```
8. Guarda el **Client ID** y **Client Secret**

### Paso 2: Configurar en Supabase

1. En el dashboard de Supabase, ve a **Authentication** > **Providers**
2. Habilita **Google**
3. Ingresa el **Client ID** y **Client Secret** de Google
4. Guarda los cambios

## 4. Aplicar Migraciones de Base de Datos

Las migraciones ya han sido aplicadas automáticamente durante la configuración inicial del proyecto. Esto incluye:

- Tabla `profiles` con RLS
- Tabla `dietas_config` con RLS
- Políticas de seguridad apropiadas

Para verificar que las tablas existen:

1. Ve a **Table Editor** en el dashboard de Supabase
2. Verifica que existan las tablas `profiles` y `dietas_config`
3. Ve a **Authentication** > **Policies** para ver las políticas RLS

## 5. Configurar Email Auth

En **Authentication** > **Email**:

1. Habilita **Enable Email Confirmations** si quieres confirmar emails (opcional)
2. Configura las plantillas de email si lo deseas

## 6. Variables de Entorno Local

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

## 7. Variables de Entorno en Vercel

Cuando despliegues en Vercel:

1. Ve a tu proyecto en Vercel
2. **Settings** > **Environment Variables**
3. Agrega las mismas variables que en `.env.local`

## 8. Configuración de Dominios (Producción)

Cuando tengas tu dominio personalizado:

1. En Supabase: **Authentication** > **URL Configuration**
2. Agrega tu dominio a **Site URL**
3. Agrega tus URLs de redirección a **Redirect URLs**
   - `https://tudominio.com`
   - `https://tudominio.com/`

## Notas Importantes

- Las credenciales de Supabase son específicas para cada proyecto
- NUNCA compartas tu `service_role_key` (no se usa en el frontend)
- La `anon_key` es segura para usar en el cliente
- RLS debe estar siempre habilitado en producción

## Soporte

Si tienes problemas con la configuración:
- Revisa la [documentación de Supabase](https://supabase.com/docs)
- Contacta: soporte@tacoplan.es
