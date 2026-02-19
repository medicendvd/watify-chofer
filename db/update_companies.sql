USE watify;

-- ── Eliminar empresas ────────────────────────────────────────────
UPDATE companies SET is_active = 0 WHERE name IN (
  'Nice Garrafones',
  'Cinthia Chang',
  'Amor del fresco',
  'Barracuda',
  'Grupo pretoria'
);

-- ── Actualizar precios de Recarga (product_id=1) ─────────────────
UPDATE company_prices cp
JOIN companies c ON c.id = cp.company_id
SET cp.price = 50.00
WHERE cp.product_id = 1 AND c.name IN (
  '100 Ladrillos',
  'Buffet Jurídico',
  'Mueblería Massent',
  'Casa Robert',
  'Juicy folks',
  'Kapital financiera',
  'KIVA Proyectos',
  'Nomadat',
  'on energy',
  'WERKSHOP'
);

UPDATE company_prices cp
JOIN companies c ON c.id = cp.company_id
SET cp.price = 40.00
WHERE cp.product_id = 1 AND c.name IN (
  'Creparis',
  'Región Sanitaria'
);

-- ── Agregar nuevas empresas ──────────────────────────────────────
INSERT INTO companies (name, is_active) VALUES
  ('Farmacia Mary',          1),
  ('Gruas Perez',            1),
  ('Fotón',                  1),
  ('Arrive Logistics',       1),
  ('Escuela Utility Profit', 1);

-- ── Precios de Recarga para nuevas empresas ──────────────────────
INSERT INTO company_prices (company_id, product_id, price)
SELECT c.id, 1, p.precio
FROM companies c
JOIN (
  SELECT 'Farmacia Mary'          AS nombre, 45.00 AS precio UNION ALL
  SELECT 'Gruas Perez',                      50.00           UNION ALL
  SELECT 'Fotón',                            45.00           UNION ALL
  SELECT 'Arrive Logistics',                 45.00           UNION ALL
  SELECT 'Escuela Utility Profit',           50.00
) p ON p.nombre = c.name;
