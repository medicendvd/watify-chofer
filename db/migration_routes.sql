USE watify;

-- ── Rutas del chofer ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  garrafones_loaded INT NOT NULL DEFAULT 0,
  status           ENUM('active','finished') DEFAULT 'active',
  started_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at      TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── Garrafones quebrados ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broken_garrafones (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  route_id       INT NOT NULL,
  user_id        INT NOT NULL,
  was_full       TINYINT(1) NOT NULL COMMENT '1=lleno, 0=vacío',
  condition_type ENUM('buen_estado','uso_leve','parchado','tostado') NOT NULL,
  reported_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES routes(id),
  FOREIGN KEY (user_id)  REFERENCES users(id)
);

-- ── Agregar route_id a transactions ──────────────────────────────────────────
ALTER TABLE transactions
  ADD COLUMN route_id INT NULL AFTER user_id,
  ADD CONSTRAINT fk_tx_route FOREIGN KEY (route_id) REFERENCES routes(id);
