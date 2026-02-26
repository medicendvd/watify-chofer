-- Migración: Asignación de empresas por zona de chofer

CREATE TABLE company_assignments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  user_id    INT NOT NULL,
  priority   INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_company_user (company_id, user_id)
);

-- ch1 (user_id=3)
INSERT INTO company_assignments (company_id, user_id, priority) VALUES
  (3,  3,  1),  -- Candy Pop
  (12, 3,  2),  -- 100 Ladrillos
  (11, 3,  3),  -- Kapital financiera
  (6,  3,  4),  -- KIVA Proyectos
  (23, 3,  5),  -- Arrive Logistics
  (24, 3,  6),  -- Escuela Utility Profit
  (7,  3,  7),  -- Mueblería Massent
  (19, 3,  8),  -- on energy
  (18, 3,  9),  -- Creparis
  (4,  3, 10),  -- Juicy folks
  (8,  3, 11),  -- Casa Robert
  (15, 3, 12),  -- Buffet Jurídico
  (1,  3, 13),  -- Región Sanitaria
  (31, 3, 14),  -- Albercas Opia
  (29, 3, 15),  -- Banco Azteca
  (28, 3, 16),  -- GDL CONNECT
  (36, 3, 17),  -- Juan carlos linares
  (33, 3, 18),  -- Lendi Capital
  (37, 3, 19),  -- Niza sanchez
  (30, 3, 20),  -- Asilo de ancianos
  (35, 3, 21),  -- Salon de eventos ruben dario
  (20, 3, 22);  -- Farmacia Mary

-- ch2 (user_id=4)
INSERT INTO company_assignments (company_id, user_id, priority) VALUES
  (18, 4, 1),  -- Creparis
  (1,  4, 2),  -- Región Sanitaria
  (5,  4, 3),  -- WERKSHOP
  (21, 4, 4),  -- Gruas Perez
  (22, 4, 5),  -- Fotón
  (32, 4, 6),  -- Saplagsa
  (34, 4, 7),  -- SISEGA
  (30, 4, 8),  -- Asilo de ancianos
  (26, 4, 9);  -- Tiendita de Mario
