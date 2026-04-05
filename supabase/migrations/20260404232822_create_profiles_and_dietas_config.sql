/*
  # Crear tablas para Tacoplan
  
  1. Tablas Nuevas
    - `profiles`
      - `id` (uuid, FK a auth.users)
      - `nombre` (text)
      - `email` (text)
      - `plan` (text) - básico, pro
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `dietas_config`
      - `id` (uuid, PK)
      - `user_id` (uuid, FK a auth.users)
      - `dieta_nacional` (numeric) - cantidad dieta nacional
      - `dieta_internacional` (numeric) - cantidad dieta internacional
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para que usuarios solo accedan a sus propios datos
*/

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  email text NOT NULL,
  plan text DEFAULT 'basico' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden insertar su propio perfil"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Los usuarios pueden eliminar su propio perfil"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Tabla de configuración de dietas
CREATE TABLE IF NOT EXISTS dietas_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dieta_nacional numeric DEFAULT 28.0 NOT NULL,
  dieta_internacional numeric DEFAULT 53.0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE dietas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver su config de dietas"
  ON dietas_config FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar su config de dietas"
  ON dietas_config FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar su config de dietas"
  ON dietas_config FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar su config de dietas"
  ON dietas_config FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
