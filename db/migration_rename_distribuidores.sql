-- Renombrar "Negocios en Efectivo" → "Distribuidores" para consistencia con el resto del sistema
UPDATE payment_methods SET name = 'Distribuidores' WHERE name = 'Negocios en Efectivo';
