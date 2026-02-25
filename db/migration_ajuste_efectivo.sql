-- Agrega soporte para incidencias de tipo "ajuste" en weekly_incidents
ALTER TABLE weekly_incidents
  ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'deduccion',
  ADD COLUMN prev_efectivo DECIMAL(10,2) NULL;
