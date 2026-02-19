-- ============================================================
-- Watify — Seed inicial
-- Nota: los hashes de password fueron generados con bcrypt cost=10
--   112233 → $2y$10$... (david, chevo)
--   1111   → $2y$10$... (ch1)
--   2222   → $2y$10$... (ch2)
--   3333   → $2y$10$... (ch3)
-- Si corres este seed desde PHP usa seed.php que genera los hashes.
-- ============================================================

USE watify;

-- Limpiar datos existentes (orden por FK)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE transaction_items;
TRUNCATE TABLE transactions;
TRUNCATE TABLE company_prices;
TRUNCATE TABLE companies;
TRUNCATE TABLE payment_methods;
TRUNCATE TABLE products;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Usuarios (passwords hasheados en seed.php)
-- Se insertan desde seed.php, no aquí, para usar password_hash()

-- Productos (orden de visualización: Recarga, Nuevo, Mini, 10Pack)
INSERT INTO products (id, name, base_price, display_order) VALUES
(1, 'Recarga', 50.00, 1),
(2, 'Nuevo',   140.00, 2),
(3, 'Mini',    25.00, 3),
(4, '10Pack',  99.00, 4);

-- Métodos de pago
INSERT INTO payment_methods (id, name, color, icon, is_active) VALUES
(1, 'Efectivo', '#22c55e', 'banknote',    1),
(2, 'Tarjeta',  '#3b82f6', 'credit-card', 1),
(3, 'Negocios', '#7c3aed', 'building-2',  1),
(4, 'Link',     '#f97316', 'smartphone',  1);

-- Empresas (nombre | precio Recarga)
INSERT INTO companies (id, name) VALUES
(1,  'Región Sanitaria'),
(2,  'Nice Garrafones'),
(3,  'Candy Pop'),
(4,  'Juicy folks'),
(5,  'WERKSHOP'),
(6,  'KIVA Proyectos'),
(7,  'Mueblería Massent'),
(8,  'Casa Robert'),
(9,  'Amor del fresco'),
(10, 'Barracuda'),
(11, 'Kapital financiera'),
(12, '100 Ladrillos'),
(13, 'Seguripret'),
(14, 'Grupo pretoria'),
(15, 'Buffet Jurídico'),
(16, 'Cinthia Chang'),
(17, 'Nomadat'),
(18, 'Creparis'),
(19, 'on energy');

-- Precios especiales de Recarga (product_id=1) por empresa
-- Los demás productos usan precio base hasta que Admin los configure
INSERT INTO company_prices (company_id, product_id, price) VALUES
(1,  1, 36.00),  -- Región Sanitaria
(2,  1, 36.00),  -- Nice Garrafones
(3,  1, 42.00),  -- Candy Pop
(4,  1, 45.00),  -- Juicy folks
(5,  1, 45.00),  -- WERKSHOP
(6,  1, 45.00),  -- KIVA Proyectos
(7,  1, 45.00),  -- Mueblería Massent
(8,  1, 45.00),  -- Casa Robert
(9,  1, 36.00),  -- Amor del fresco
(10, 1, 45.00),  -- Barracuda
(11, 1, 45.00),  -- Kapital financiera
(12, 1, 45.00),  -- 100 Ladrillos
(13, 1, 45.00),  -- Seguripret
(14, 1, 45.00),  -- Grupo pretoria
(15, 1, 45.00),  -- Buffet Jurídico
(16, 1, 45.00),  -- Cinthia Chang
(17, 1, 45.00),  -- Nomadat
(18, 1, 38.00),  -- Creparis
(19, 1, 45.00);  -- on energy
