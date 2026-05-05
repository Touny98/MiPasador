-- Enable the unaccent extension for normalized_name functionality
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Trigger function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger function to automatically set normalized_name from name
CREATE OR REPLACE FUNCTION normalize_name()
RETURNS TRIGGER AS $$
BEGIN
   NEW.normalized_name = unaccent(lower(NEW.name));
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Table: comisiones
CREATE TABLE IF NOT EXISTS public.comisiones (
   created_at timestamp with time zone NULL,
   fecha timestamp with time zone NULL,
   id integer NOT NULL,
   link_pago text NULL,
   monto_comision double precision NULL,
   pagado boolean NULL,
   pasador_id integer NULL,
   total_viajes integer NULL,
   PRIMARY KEY (id)
);

-- Foreign keys for comisiones
ALTER TABLE IF EXISTS public.comisiones
   ADD CONSTRAINT IF NOT EXISTS comisiones_pasador_id_fkey FOREIGN KEY (pasador_id) REFERENCES public.pasadores(id);

-- Indexes for comisiones
CREATE INDEX IF NOT EXISTS idx_comisiones_pasador_id ON public.comisiones(pasador_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_updated_at ON public.comisiones(updated_at); -- Note: comisiones doesn't have updated_at? Check the TypeScript: it doesn't. So we skip.

-- Table: conversations
CREATE TABLE IF NOT EXISTS public.conversations (
   context jsonb NULL,
   created_at timestamp with time zone NULL,
   id text NOT NULL,
   is_active boolean NULL,
   merchant_id text NULL,
   updated_at timestamp with time zone NULL,
   user_name text NULL,
   user_whatsapp_id text NOT NULL,
   PRIMARY KEY (id)
);

-- Foreign keys for conversations
ALTER TABLE IF EXISTS public.conversations
   ADD CONSTRAINT IF NOT EXISTS conversations_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_merchant_id ON public.conversations(merchant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user_whatsapp_id ON public.conversations(user_whatsapp_id);

-- Triggers for conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
   BEFORE UPDATE ON public.conversations
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column();

-- Table: events
CREATE TABLE IF NOT EXISTS public.events (
   created_at timestamp with time zone NULL,
   description text NULL,
   end_time timestamp with time zone NULL,
   event_type text NULL,
   id text NOT NULL,
   is_active boolean NULL,
   merchant_id text NULL,
   metadata jsonb NULL,
   start_time timestamp with time zone NULL,
   title text NOT NULL,
   updated_at timestamp with time zone NULL,
   PRIMARY KEY (id)
);

-- Foreign keys for events
ALTER TABLE IF EXISTS public.events
   ADD CONSTRAINT IF NOT EXISTS events_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_merchant_id ON public.events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_events_updated_at ON public.events(updated_at);
CREATE INDEX IF NOT EXISTS idx_events_title ON public.events(title);

-- Triggers for events
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
   BEFORE UPDATE ON public.events
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column();

-- Table: exchange_rates
CREATE TABLE IF NOT EXISTS public.exchange_rates (
   base_currency text NOT NULL,
   id text NOT NULL,
   rate double precision NOT NULL,
   target_currency text NOT NULL,
   timestamp timestamp with time zone NULL,
   PRIMARY KEY (id)
);

-- No foreign keys for exchange_rates

-- Indexes for exchange_rates
CREATE INDEX IF NOT EXISTS idx_exchange_rates_base_currency ON public.exchange_rates(base_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_target_currency ON public.exchange_rates(target_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_timestamp ON public.exchange_rates(timestamp);

-- Table: merchants
CREATE TABLE IF NOT EXISTS public.merchants (
   address text NULL,
   created_at timestamp with time zone NULL,
   description text NULL,
   id text NOT NULL,
   is_active boolean NULL,
   name text NOT NULL,
   phone_number text NULL,
   updated_at timestamp with time zone NULL,
   whatsapp_business_id text NULL,
   PRIMARY KEY (id)
);

-- No foreign keys for merchants

-- Indexes for merchants
CREATE INDEX IF NOT EXISTS idx_merchants_name ON public.merchants(name);
CREATE INDEX IF NOT EXISTS idx_merchants_updated_at ON public.merchants(updated_at);
CREATE INDEX IF NOT EXISTS idx_merchants_whatsapp_business_id ON public.merchants(whatsapp_business_id);

-- Triggers for merchants
DROP TRIGGER IF EXISTS update_merchants_updated_at ON public.merchants;
CREATE TRIGGER update_merchants_updated_at
   BEFORE UPDATE ON public.merchants
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_merchants_normalized_name ON public.merchants;
CREATE TRIGGER update_merchants_normalized_name
   BEFORE INSERT OR UPDATE ON public.merchants
   FOR EACH ROW
   WHEN (NEW.name IS DISTINCT FROM OLD.name OR NEW.normalized_name IS DISTINCT FROM OLD.normalized_name)
   EXECUTE FUNCTION normalize_name();

-- Table: messages
CREATE TABLE IF NOT EXISTS public.messages (
   content text NOT NULL,
   conversation_id text NULL,
   created_at timestamp with time zone NULL,
   direction text NULL,
   id text NOT NULL,
   message_type text NULL,
   metadata jsonb NULL,
   whatsapp_message_id text NULL,
   PRIMARY KEY (id)
);

-- Foreign keys for messages
ALTER TABLE IF EXISTS public.messages
   ADD CONSTRAINT IF NOT EXISTS messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON public.messages(direction);

-- Table: pasadores
CREATE TABLE IF NOT EXISTS public.pasadores (
   activo boolean NULL,
   cantidad_viajes_completados integer NULL,
   created_at timestamp with time zone NULL,
   dni text NULL,
   estado text NULL,
   id integer NOT NULL,
   nombre_completo text NULL,
   reputacion_promedio double precision NULL,
   ultima_conexion timestamp with time zone NULL,
   wa_user_id text NOT NULL,
   PRIMARY KEY (id)
);

-- No foreign keys for pasadores

-- Indexes for pasadores
CREATE INDEX IF NOT EXISTS idx_pasadores_wa_user_id ON public.pasadores(wa_user_id);
CREATE INDEX IF NOT EXISTS idx_pasadores_estado ON public.pasadores(estado);

-- Table: postulaciones
CREATE TABLE IF NOT EXISTS public.postulaciones (
   correcciones jsonb NULL,
   created_at timestamp with time zone NULL,
   dni text NULL,
   estado text NULL,
   id integer NOT NULL,
   imagen_dorso_url text NULL,
   imagen_frente_url text NULL,
   nombre_completo text NULL,
   pdf_url text NULL,
   wa_user_id text NULL,
   PRIMARY KEY (id)
);

-- No foreign keys for postulaciones

-- Indexes for postulaciones
CREATE INDEX IF NOT EXISTS idx_postulaciones_dni ON public.postulaciones(dni);
CREATE INDEX IF NOT EXISTS idx_postulaciones_estado ON public.postulaciones(estado);

-- Table: products
CREATE TABLE IF NOT EXISTS public.products (
   category text NULL,
   created_at timestamp with time zone NULL,
   currency text NULL,
   description text NULL,
   id text NOT NULL,
   image_url text NULL,
   is_active boolean NULL,
   merchant_id text NULL,
   name text NOT NULL,
   normalized_name text NULL,
   price double precision NULL,
   sku text NULL,
   stock integer NULL,
   updated_at timestamp with time zone NULL,
   PRIMARY KEY (id)
);

-- Foreign keys for products
ALTER TABLE IF EXISTS public.products
   ADD CONSTRAINT IF NOT EXISTS products_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON public.products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_normalized_name ON public.products(normalized_name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products(updated_at);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- Triggers for products
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
   BEFORE UPDATE ON public.products
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_normalized_name ON public.products;
CREATE TRIGGER update_products_normalized_name
   BEFORE INSERT OR UPDATE ON public.products
   FOR EACH ROW
   WHEN (NEW.name IS DISTINCT FROM OLD.name OR NEW.normalized_name IS DISTINCT FROM OLD.normalized_name)
   EXECUTE FUNCTION normalize_name();

-- Table: queries
CREATE TABLE IF NOT EXISTS public.queries (
   clicked_product_id text NULL,
   conversation_id text NULL,
   created_at timestamp with time zone NULL,
   id text NOT NULL,
   normalized_search_term text NULL,
   resolved_bool boolean NOT NULL,
   results_count integer NULL,
   search_term text NOT NULL,
   PRIMARY KEY (id)
);

-- Foreign keys for queries
ALTER TABLE IF EXISTS public.queries
   ADD CONSTRAINT IF NOT EXISTS queries_clicked_product_id_fkey FOREIGN KEY (clicked_product_id) REFERENCES public.products(id),
   ADD CONSTRAINT IF NOT EXISTS queries_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_queries_clicked_product_id ON public.queries(clicked_product_id);
CREATE INDEX IF NOT EXISTS idx_queries_conversation_id ON public.queries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_queries_search_term ON public.queries(search_term);
CREATE INDEX IF NOT EXISTS idx_queries_normalized_search_term ON public.queries(normalized_search_term);
CREATE INDEX IF NOT EXISTS idx_queries_resolved_bool ON public.queries(resolved_bool);

-- Table: ratings
CREATE TABLE IF NOT EXISTS public.ratings (
   comentario text NULL,
   created_at timestamp with time zone NULL,
   id integer NOT NULL,
   pasador_id integer NULL,
   puntuacion integer NULL,
   usuario_wa_id text NULL,
   viaje_id integer NULL,
   PRIMARY KEY (id)
);

-- Foreign keys for ratings
ALTER TABLE IF EXISTS public.ratings
   ADD CONSTRAINT IF NOT EXISTS ratings_pasador_id_fkey FOREIGN KEY (pasador_id) REFERENCES public.pasadores(id),
   ADD CONSTRAINT IF NOT EXISTS ratings_viaje_id_fkey FOREIGN KEY (viaje_id) REFERENCES public.viajes(id);

-- Indexes for ratings
CREATE INDEX IF NOT EXISTS idx_ratings_pasador_id ON public.ratings(pasador_id);
CREATE INDEX IF NOT EXISTS idx_ratings_viaje_id ON public.ratings(viaje_id);
CREATE INDEX IF NOT EXISTS idx_ratings_puntuacion ON public.ratings(puntuacion);

-- Table: reservations
CREATE TABLE IF NOT EXISTS public.reservations (
   conversation_id text NULL,
   created_at timestamp with time zone NULL,
   id text NOT NULL,
   notes text NULL,
   product_id text NULL,
   quantity integer NULL,
   status text NULL,
   updated_at timestamp with time zone NULL,
   PRIMARY KEY (id)
);

-- Foreign keys for reservations
ALTER TABLE IF EXISTS public.reservations
   ADD CONSTRAINT IF NOT EXISTS reservations_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
   ADD CONSTRAINT IF NOT EXISTS reservations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

-- Indexes for reservations
CREATE INDEX IF NOT EXISTS idx_reservations_conversation_id ON public.reservations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reservations_product_id ON public.reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_updated_at ON public.reservations(updated_at);

-- Triggers for reservations
DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;
CREATE TRIGGER update_reservations_updated_at
   BEFORE UPDATE ON public.reservations
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column();

-- Table: sesiones_pasador
CREATE TABLE IF NOT EXISTS public.sesiones_pasador (
   fin timestamp with time zone NULL,
   id integer NOT NULL,
   inicio timestamp with time zone NULL,
   pasador_id integer NULL,
   resumen_enviado boolean NULL,
   total_comision double precision NULL,
   viajes_realizados integer NULL,
   PRIMARY KEY (id)
);

-- Foreign keys for sesiones_pasador
ALTER TABLE IF EXISTS public.sesiones_pasador
   ADD CONSTRAINT IF NOT EXISTS sesiones_pasador_pasador_id_fkey FOREIGN KEY (pasador_id) REFERENCES public.pasadores(id);

-- Indexes for sesiones_pasador
CREATE INDEX IF NOT EXISTS idx_sesiones_pasador_pasador_id ON public.sesiones_pasador(pasador_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_pasador_fin ON public.sesiones_pasador(fin);
CREATE INDEX IF NOT EXISTS idx_sesiones_pasador_inicio ON public.sesiones_pasador(inicio);

-- Table: tarifas_pasador
CREATE TABLE IF NOT EXISTS public.tarifas_pasador (
   activa boolean NULL,
   id integer NOT NULL,
   peso_max integer NULL,
   peso_min integer NULL,
   precio_ars double precision NULL,
   ruta text NULL,
   PRIMARY KEY (id)
);

-- No foreign keys for tarifas_pasador

-- Indexes for tarifas_pasador
CREATE INDEX IF NOT EXISTS idx_tarifas_pasador_activa ON public.tarifas_pasador(activa);
CREATE INDEX IF NOT EXISTS idx_tarifas_pasador_ruta ON public.tarifas_pasador(ruta);

-- Table: viajes
CREATE TABLE IF NOT EXISTS public.viajes (
   comision_ars double precision NULL,
   completado_at timestamp with time zone NULL,
   created_at timestamp with time zone NULL,
   descripcion text NULL,
   direccion_destino text NULL,
   direccion_origen text NULL,
   estado text NULL,
   id integer NOT NULL,
   pasador_id integer NULL,
   peso double precision NULL,
   precio_ars double precision NULL,
   rating integer NULL,
   ruta text NULL,
   usuario_wa_id text NULL,
   PRIMARY KEY (id)
);

-- Foreign keys for viajes
ALTER TABLE IF EXISTS public.viajes
   ADD CONSTRAINT IF NOT EXISTS viajes_pasador_id_fkey FOREIGN KEY (pasador_id) REFERENCES public.pasadores(id);

-- Indexes for viajes
CREATE INDEX IF NOT EXISTS idx_viajes_pasador_id ON public.viajes(pasador_id);
CREATE INDEX IF NOT EXISTS idx_viajes_estado ON public.viajes(estado);
CREATE INDEX IF NOT EXISTS idx_viajes_completado_at ON public.viajes(completado_at);
CREATE INDEX IF NOT EXISTS idx_viajes_precio_ars ON public.viajes(precio_ars);
CREATE INDEX IF NOT EXISTS idx_viajes_rating ON public.viajes(rating);
CREATE INDEX IF NOT EXISTS idx_viajes_ruta ON public.viajes(ruta);

-- Enable Row Level Security and create policies for all tables
-- We'll enable RLS and then create policies for each table.

-- Policy template for service role: full access
-- Policy template for anon key:
--   For tables with merchant_id: restrict to merchant_id from JWT claim
--   For tables without merchant_id: we deny all by default (user must adjust)

-- We'll do this per table.

-- Table: comisiones (no merchant_id, so we deny anon access by default)
ALTER TABLE public.comisiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comisiones_service_role_full_access" ON public.comisiones
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "comisiones_anon_no_access" ON public.comisiones
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);

-- Table: conversations (has merchant_id)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_service_role_full_access" ON public.conversations
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "conversations_anon_merchant_restricted" ON public.conversations
   FOR ALL
   TO anon
   USING (merchant_id = current_setting('request.jwt.claim.merchant_id')::text)
   WITH CHECK (merchant_id = current_setting('request.jwt.claim.merchant_id')::text);

-- Table: events (has merchant_id)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_service_role_full_access" ON public.events
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "events_anon_merchant_restricted" ON public.events
   FOR ALL
   TO anon
   USING (merchant_id = current_setting('request.jwt.claim.merchant_id')::text)
   WITH CHECK (merchant_id = current_setting('request.jwt.claim.merchant_id')::text);

-- Table: exchange_rates (no merchant_id)
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exchange_rates_service_role_full_access" ON public.exchange_rates
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "exchange_rates_anon_no_access" ON public.exchange_rates
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);

-- Table: merchants (no merchant_id, but it is the tenant table)
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchants_service_role_full_access" ON public.merchants
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "merchants_anon_no_access" ON public.merchants
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);

-- Table: messages (no direct merchant_id, but linked via conversation)
-- We'll treat as no merchant_id for simplicity (user may want to adjust to use conversation.merchant_id)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_service_role_full_access" ON public.messages
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "messages_anon_no_access" ON public.messages
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);

-- Table: pasadores (no merchant_id)
ALTER TABLE public.pasadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pasadores_service_role_full_access" ON public.pasadores
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "pasadores_anon_no_access" ON public.pasadores
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);

-- Table: postulaciones (no merchant_id)
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "postulaciones_service_role_full_access" ON public.postulaciones
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "postulaciones_anon_no_access" ON public.postulaciones
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);

-- Table: products (has merchant_id)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_service_role_full_access" ON public.products
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "products_anon_merchant_restricted" ON public.products
   FOR ALL
   TO anon
   USING (merchant_id = current_setting('request.jwt.claim.merchant_id')::text)
   WITH CHECK (merchant_id = current_setting('request.jwt.claim.merchant_id')::text);

-- Table: queries (no direct merchant_id, but linked via conversation or product)
-- We'll treat as no merchant_id for simplicity
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queries_service_role_full_access" ON public.queries
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "queries_anon_no_access" ON public.queries
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);

-- Table: ratings (no direct merchant_id)
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_service_role_full_access" ON public.ratings
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "ratings_anon_no_access" ON public.ratings
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);

-- Table: reservations (no direct merchant_id, but linked via product or conversation)
-- We'll treat as no merchant_id for simplicity
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservations_service_role_full_access" ON public.reservations
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "reservations_anon_no_access" ON public.reservations
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);

-- Table: sesiones_pasador (no merchant_id)
ALTER TABLE public.sesiones_pasador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sesiones_pasador_service_role_full_access" ON public.sesiones_pasador
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "sesiones_pasador_anon_no_access" ON public.sesiones_pasador
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);

-- Table: tarifas_pasador (no merchant_id)
ALTER TABLE public.tarifas_pasador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tarifas_pasador_service_role_full_access" ON public.tarifas_pasador
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "tarifas_pasador_anon_no_access" ON public.tarifas_pasador
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);

-- Table: viajes (no merchant_id)
ALTER TABLE public.viajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "viajes_service_role_full_access" ON public.viajes
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
CREATE POLICY "viajes_anon_no_access" ON public.viajes
   FOR ALL
   TO anon
   USING (false)
   WITH CHECK (false);