-- Seed data for Mi Pasador admin panel
-- Inserts 5 merchants and 15 products with realistic data for Bermejo, Tarija
-- Prices in BOB (Bolivianos), 1 USD ≈ 6.96 BOB

-- Insert merchants and products using CTEs to get merchant IDs for product references
WITH inserted_merchants AS (
  INSERT INTO merchants (name, description, phone_number, address, is_active) VALUES
  ('Electrodomésticos Bermejo', 'Tienda especializada en electrodomésticos y tecnología', '+591 4 6XXXXX', 'Av. Principal #123, Bermejo', true),
  ('Perfumería Andina', 'Perfumes, cosméticos y productos de belleza de marcas internacionales', '+591 4 6YYYYY', 'Calle Comercio #456, Bermejo', true),
  ('Calzado del Valle', 'Calzado deportivo, casual y formal para toda la familia', '+591 4 6ZZZZZ', 'Plaza Central #789, Bermejo', true),
  ('Supermercado Aroma', 'Supermercado completo con productos de primera necesidad', '+591 4 6WWWWW', 'Av. Bolivariana #321, Bermejo', true),
  ('Ferretería Industrial', 'Herramientas, materiales de construcción y suministros industriales', '+591 4 6VVVVV', 'Zona Industrial #654, Bermejo', true)
  RETURNING id, name
),
electronics_products AS (
  INSERT INTO products (merchant_id, name, description, price, currency, sku, category, stock, image_url, is_active)
  SELECT
    id,
    'Freidora de Aire Philips HD9252/90',
    'Freidora de aire sin aceite con capacidad 4.2L, tecnologia TurboStar',
    1200.00,  -- ~172 USD
    'BOB',
    'FREID-PHILIPS-42L',
    'Electrodomésticos',
    15,
    'https://example.com/freidora-philips.jpg',
    true
  FROM inserted_merchants WHERE name = 'Electrodomésticos Bermejo'
  UNION ALL
  SELECT
    id,
    'Lavadora Samsung WD80T4046AX/BD',
    'Lavadora seca ropa 8kg/5kg, tecnologia EcoBubble, control digital',
    2800.00,  -- ~402 USD
    'BOB',
    'LAVA-SAMSUNG-8KG',
    'Electrodomésticos',
    8,
    'https://example.com/lavadora-samsung.jpg',
    true
  FROM inserted_merchants WHERE name = 'Electrodomésticos Bermejo'
  UNION ALL
  SELECT
    id,
    'Televisor LG 55UR8000PUA',
    'Smart TV 55 pulgadas 4K UHD, webOS, HDR10 Pro',
    3500.00,  -- ~503 USD
    'BOB',
    'TV-LG-55-4K',
    'Electrodomésticos',
    12,
    'https://example.com/tv-lg-55.jpg',
    true
  FROM inserted_merchants WHERE name = 'Electrodomésticos Bermejo'
),
perfumery_products AS (
  INSERT INTO products (merchant_id, name, description, price, currency, sku, category, stock, image_url, is_active)
  SELECT
    id,
    'Perfume Chanel No. 5 Eau de Parfum',
    'Fragancia icónica floral aldehídica, 100ml',
    680.00,   -- ~98 USD
    'BOB',
    'PERF-CHANEL-N5-100ML',
    'Perfumería',
    25,
    'https://example.com/chanel-no5.jpg',
    true
  FROM inserted_merchants WHERE name = 'Perfumería Andina'
  UNION ALL
  SELECT
    id,
    'Crema Nivea Soft Hidratante',
    'Crema hidratante multiuso para piel normal y seca, 200ml',
    35.00,    -- ~5 USD
    'BOB',
    'CREM-NIVEA-SOFT-200ML',
    'Perfumería',
    100,
    'https://example.com/nivea-soft.jpg',
    true
  FROM inserted_merchants WHERE name = 'Perfumería Andina'
  UNION ALL
  SELECT
    id,
    'Labial MAC Ruby Woo',
    'Labial mate rojo clásico, 3g',
    120.00,   -- ~17 USD
    'BOB',
    'LABIAL-MAC-RUBY-WOO',
    'Perfumería',
    40,
    'https://example.com/mac-ruby-woo.jpg',
    true
  FROM inserted_merchants WHERE name = 'Perfumería Andina'
),
footwear_products AS (
  INSERT INTO products (merchant_id, name, description, price, currency, sku, category, stock, image_url, is_active)
  SELECT
    id,
    'Zapatillas Nike Air Max 270',
    'Zapatillas deportivas con cámara de aire visible, varios colores',
    480.00,   -- ~69 USD
    'BOB',
    'ZAPAT-NIKE-AIRMAX270',
    'Calzado',
    30,
    'https://example.com/nike-airmax270.jpg',
    true
  FROM inserted_merchants WHERE name = 'Calzado del Valle'
  UNION ALL
  SELECT
    id,
    'Botines Timberland 6 Inch Premium',
    'Botines impermeables de cuero nubuck, clásica amarilla',
    520.00,   -- ~75 USD
    'BOB',
    'BOTIN-TIMBERLAND-6PREM',
    'Calzado',
    20,
    'https://example.com/timberland-6inch.jpg',
    true
  FROM inserted_merchants WHERE name = 'Calzado del Valle'
  UNION ALL
  SELECT
    id,
    'Sandalias Birkenstock Arizona',
    'Sandalias de corcho y látex con dos straps ajustables',
    380.00,   -- ~55 USD
    'BOB',
    'SANDAL-BIRK-ARIZONA',
    'Calzado',
    25,
    'https://example.com/birkenstock-arizona.jpg',
    true
  FROM inserted_merchants WHERE name = 'Calzado del Valle'
),
supermarket_products AS (
  INSERT INTO products (merchant_id, name, description, price, currency, sku, category, stock, image_url, is_active)
  SELECT
    id,
    'Arroz Boliviano Royal Pearl',
    'Arroz blanco grano largo, paquete 5kg',
    25.00,    -- ~3.6 USD
    'BOB',
    'ARROZ-ROYAL-5KG',
    'Abarrotes',
    200,
    'https://example.com/arroz-royal.jpg',
    true
  FROM inserted_merchants WHERE name = 'Supermercado Aroma'
  UNION ALL
  SELECT
    id,
    'Aceite de Girasol Cocinero',
    'Aceite vegetal para fritura y cocina, botella 1.5L',
    18.00,    -- ~2.6 USD
    'BOB',
    'ACEITE-COcinero-1.5L',
    'Abarrotes',
    150,
    'https://example.com/aceite-girasol.jpg',
    true
  FROM inserted_merchants WHERE name = 'Supermercado Aroma'
  UNION ALL
  SELECT
    id,
    'Leche Entera Gloria',
    'Leche pasteurizada entera, bolsa 1L',
    8.50,     -- ~1.2 USD
    'BOB',
    'LECHE-GLORIA-ENTERA-1L',
    'Lácteos',
    300,
    'https://example.com/leche-gloria.jpg',
    true
  FROM inserted_merchants WHERE name = 'Supermercado Aroma'
),
hardware_products AS (
  INSERT INTO products (merchant_id, name, description, price, currency, sku, category, stock, image_url, is_active)
  SELECT
    id,
    'Taladro Percutor Bosch GSB 18V-21',
    'Taladro inalámbrico 18V con 2 baterías y maletin',
    320.00,   -- ~46 USD
    'BOB',
    'TALADRO-BOSCH-GSB18V21',
    'Ferretería',
    12,
    'https://example.com/taladro-bosch.jpg',
    true
  FROM inserted_merchants WHERE name = 'Ferretería Industrial'
  UNION ALL
  SELECT
    id,
    'Juego de Destornilladores Stanley 6 Piezas',
    'Juego de destornilladores de punta plana y Phillips',
    25.00,    -- ~3.6 USD
    'BOB',
    'DEST-S-TANLEY-6PCS',
    'Ferretería',
    50,
    'https://example.com/destornilladores-stanley.jpg',
    true
  FROM inserted_merchants WHERE name = 'Ferretería Industrial'
  UNION ALL
  SELECT
    id,
    'Bolsa de Cemento Portland 50kg',
    'Cemento tipo CP-30 para construcción, bolsa 50kg',
    42.00,    -- ~6 USD
    'BOB',
    'CEMENTO-PORTLAND-50KG',
    'Materiales de Construcción',
    100,
    'https://example.com/cemento-portland.jpg',
    true
  FROM inserted_merchants WHERE name = 'Ferretería Industrial'
);

-- Verify the inserted data
SELECT 'Merchants count:' as info, COUNT(*) as count FROM merchants;
SELECT 'Products count:' as info, COUNT(*) as count FROM products;
SELECT m.name as merchant, COUNT(p.id) as product_count
FROM merchants m
LEFT JOIN products p ON m.id = p.merchant_id
GROUP BY m.id, m.name
ORDER BY m.name;