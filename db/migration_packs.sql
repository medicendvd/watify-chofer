USE watify;

-- Agregar packs de agua a la carga inicial de la ruta
ALTER TABLE routes
  ADD COLUMN packs_loaded INT NOT NULL DEFAULT 0 AFTER garrafones_loaded;
