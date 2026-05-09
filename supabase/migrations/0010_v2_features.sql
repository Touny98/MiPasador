-- 1. user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id BIGSERIAL PRIMARY KEY,
  wa_user_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'merchant', 'pasador', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_roles_wa_user ON user_roles(wa_user_id);
INSERT INTO user_roles (wa_user_id, role)
SELECT wa_user_id, 'pasador' FROM pasadores WHERE wa_user_id IS NOT NULL
ON CONFLICT (wa_user_id) DO NOTHING;

-- 2. wa_user_id en merchants
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS wa_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_merchants_wa_user ON merchants(wa_user_id);

-- 3. moderation_status en products
ALTER TABLE products ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved'
  CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
UPDATE products SET moderation_status = 'approved' WHERE moderation_status IS NULL;

-- 4. subcategory en products
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- 5. Nuevos estados en compras
ALTER TABLE compras DROP CONSTRAINT IF EXISTS compras_estado_check;
ALTER TABLE compras ADD CONSTRAINT compras_estado_check CHECK (estado IN (
  'pendiente_pago', 'pagado', 'en_preparacion', 'listo_retirar',
  'retirado_por_pasador', 'en_viaje', 'en_destino', 'entregado', 'cancelado', 'expirado'
));

-- 6. ratings
CREATE TABLE IF NOT EXISTS ratings (
  id BIGSERIAL PRIMARY KEY,
  viaje_id BIGINT REFERENCES viajes(id) ON DELETE CASCADE,
  compra_id UUID REFERENCES compras(id) ON DELETE SET NULL,
  wa_user_id TEXT NOT NULL,
  pasador_id BIGINT REFERENCES pasadores(id) ON DELETE SET NULL,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_viaje ON ratings(viaje_id);

-- 7. Merchant postulations for "Publicar mi negocio" feature
CREATE TABLE IF NOT EXISTS postulaciones_comercio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_user_id TEXT NOT NULL,
  nombre_completo TEXT,
  nombre_negocio TEXT,
  dni TEXT,
  categoria_productos TEXT,
  direccion TEXT,
  foto_local_url TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'denegada')),
  correcciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_postulaciones_comercio_estado ON postulaciones_comercio(estado);
CREATE INDEX IF NOT EXISTS idx_postulaciones_comercio_wa_user_id ON postulaciones_comercio(wa_user_id);

-- 8. Add category column to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category) WHERE is_active = true;
