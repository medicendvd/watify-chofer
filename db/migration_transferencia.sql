-- Migración: Método de pago Transferencia + empresas asociadas

-- 1. Nuevo método de pago
INSERT INTO payment_methods (id, name, color, icon, is_active)
  VALUES (6, 'Transferencia', '#0369a1', 'arrow-left-right', 1);

-- 2. Empresas de Transferencia
-- NOTA: Si GDL CONNECT ya existe como Negocios a crédito, puedes
-- desactivar/eliminar la entrada anterior después de correr esta migración.
INSERT INTO companies (name, is_active, payment_method_id) VALUES
  ('GDL CONNECT',                    1, 6),
  ('Banco Azteca',                   1, 6),
  ('Asilo de ancianos',              1, 6),
  ('Albercas Opia',                  1, 6),
  ('Saplagsa',                       1, 6),
  ('Lendi Capital',                  1, 6),
  ('SISEGA',                         1, 6),
  ('Salon de eventos ruben dario',   1, 6),
  ('Juan carlos linares',            1, 6),
  ('Niza sanchez',                   1, 6);

-- 3. Precios de Recarga (product_id=1) por empresa de Transferencia
-- Usamos subconsultas por nombre para evitar hardcodear IDs
INSERT INTO company_prices (company_id, product_id, price)
  SELECT id, 1, 50.00 FROM companies WHERE name = 'GDL CONNECT'           AND payment_method_id = 6;
INSERT INTO company_prices (company_id, product_id, price)
  SELECT id, 1, 50.00 FROM companies WHERE name = 'Banco Azteca'          AND payment_method_id = 6;
INSERT INTO company_prices (company_id, product_id, price)
  SELECT id, 1, 50.00 FROM companies WHERE name = 'Asilo de ancianos'     AND payment_method_id = 6;
INSERT INTO company_prices (company_id, product_id, price)
  SELECT id, 1, 50.00 FROM companies WHERE name = 'Albercas Opia'         AND payment_method_id = 6;
INSERT INTO company_prices (company_id, product_id, price)
  SELECT id, 1, 45.00 FROM companies WHERE name = 'Saplagsa'              AND payment_method_id = 6;
INSERT INTO company_prices (company_id, product_id, price)
  SELECT id, 1, 50.00 FROM companies WHERE name = 'Lendi Capital'         AND payment_method_id = 6;
INSERT INTO company_prices (company_id, product_id, price)
  SELECT id, 1, 50.00 FROM companies WHERE name = 'SISEGA'                AND payment_method_id = 6;
INSERT INTO company_prices (company_id, product_id, price)
  SELECT id, 1, 50.00 FROM companies WHERE name = 'Salon de eventos ruben dario' AND payment_method_id = 6;
INSERT INTO company_prices (company_id, product_id, price)
  SELECT id, 1, 50.00 FROM companies WHERE name = 'Juan carlos linares'   AND payment_method_id = 6;
INSERT INTO company_prices (company_id, product_id, price)
  SELECT id, 1, 50.00 FROM companies WHERE name = 'Niza sanchez'          AND payment_method_id = 6;
