-- Nuevo método de pago (obtendrá id=5)
INSERT INTO payment_methods (name, color, icon)
VALUES ('Negocios en Efectivo', '#0d9488', 'store');

-- Columna para asociar empresa ↔ método (NULL = crédito/Negocios)
ALTER TABLE companies ADD COLUMN payment_method_id INT NULL;

-- Nuevas empresas
INSERT INTO companies (name, is_active, payment_method_id) VALUES
  ('Farmacia Mary',     1, 5),
  ('Tiendita de Mario', 1, 5),
  ('Precio de 45',      1, 5);

-- Precios especiales (Recarga)
INSERT INTO company_prices (company_id, product_id, price)
SELECT c.id, p.id,
  CASE c.name
    WHEN 'Farmacia Mary'     THEN 40
    WHEN 'Tiendita de Mario' THEN 40
    WHEN 'Precio de 45'      THEN 45
  END
FROM companies c, products p
WHERE c.name IN ('Farmacia Mary','Tiendita de Mario','Precio de 45')
  AND p.name LIKE '%Recarga%';
