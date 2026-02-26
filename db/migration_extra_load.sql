CREATE TABLE IF NOT EXISTS recargas_extra (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  route_id    INT NOT NULL,
  cantidad    INT NOT NULL,
  status      ENUM('pending','accepted') DEFAULT 'pending',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  FOREIGN KEY (route_id) REFERENCES routes(id)
);
