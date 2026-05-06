CREATE OR REPLACE FUNCTION search_products(query_text TEXT, merchant UUID DEFAULT NULL)
RETURNS TABLE(id UUID, merchant_id UUID, name TEXT, normalized_name TEXT,
              description TEXT, price NUMERIC, category TEXT, stock INT,
              image_url TEXT, total_reservations INT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.merchant_id,
    p.name,
    p.normalized_name,
    p.description,
    p.price,
    p.category,
    p.stock,
    p.image_url,
    p.total_reservations
  FROM products p
  WHERE (p.merchant_id = merchant OR merchant IS NULL)
    AND p.is_active = true
    AND (
      p.name % query_text
      OR p.normalized_name % query_text
      OR p.description % query_text
    )
  ORDER BY similarity(p.name, query_text) DESC, p.total_reservations DESC;
END;
$$;
