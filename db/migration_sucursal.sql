-- Migración: Módulo Venta en Sucursal
-- Ejecutar en MAMP/MySQL

-- 1. Ampliar ENUM de roles para incluir 'Sucursal'
ALTER TABLE users
  MODIFY COLUMN role ENUM('Admin','Visor','Chofer','Sucursal') NOT NULL;

-- 2. Crear usuario virtual de sucursal (sin password, nunca hace login)
INSERT INTO users (name, role, password)
  VALUES ('sucursal', 'Sucursal', '');

-- 3. Agregar columna para marcar productos exclusivos de sucursal
ALTER TABLE products
  ADD COLUMN sucursal_only TINYINT(1) NOT NULL DEFAULT 0;

-- 4. Insertar productos exclusivos de sucursal
INSERT INTO products (name, base_price, display_order, sucursal_only) VALUES
  ('50 Recarga',    50.00, 10, 1),
  ('45 Recarga',    45.00, 11, 1),
  ('Nuevo',        140.00, 12, 1),
  ('Envase 10L',    20.00, 13, 1),
  ('Envase 5L',     10.00, 14, 1),
  ('Mini completo', 65.00, 15, 1),
  ('Pack',          99.00, 16, 1);
