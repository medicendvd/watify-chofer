-- ============================================================
-- Watify — Schema MySQL
-- Correr en MAMP o Hostinger antes que seed.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS watify CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE watify;

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50)  UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('Admin','Visor','Chofer') NOT NULL DEFAULT 'Chofer',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productos
CREATE TABLE IF NOT EXISTS products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  base_price    DECIMAL(10,2) NOT NULL,
  display_order INT NOT NULL
);

-- Métodos de pago
CREATE TABLE IF NOT EXISTS payment_methods (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(50) NOT NULL,
  color     VARCHAR(20) NOT NULL,
  icon      VARCHAR(50) NOT NULL,
  is_active TINYINT(1) DEFAULT 1
);

-- Empresas
CREATE TABLE IF NOT EXISTS companies (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(150) NOT NULL,
  is_active TINYINT(1) DEFAULT 1
);

-- Precios especiales por empresa × producto
CREATE TABLE IF NOT EXISTS company_prices (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  product_id INT NOT NULL,
  price      DECIMAL(10,2) NOT NULL,
  UNIQUE KEY uq_company_product (company_id, product_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)  ON DELETE CASCADE
);

-- Transacciones
CREATE TABLE IF NOT EXISTS transactions (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL,
  customer_name     VARCHAR(150),
  company_id        INT,
  payment_method_id INT NOT NULL,
  total             DECIMAL(10,2) NOT NULL,
  notes             TEXT,
  transaction_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)           REFERENCES users(id),
  FOREIGN KEY (company_id)        REFERENCES companies(id),
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

-- Items de cada transacción
CREATE TABLE IF NOT EXISTS transaction_items (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  product_id     INT NOT NULL,
  quantity       INT NOT NULL,
  unit_price     DECIMAL(10,2) NOT NULL,
  subtotal       DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)     REFERENCES products(id)
);
