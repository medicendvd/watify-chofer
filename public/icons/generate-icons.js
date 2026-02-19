/**
 * Script temporal para generar iconos PNG simples para la PWA.
 * Corre con: node generate-icons.js
 * Requiere: npm install canvas (o usa sharp/jimp)
 *
 * ALTERNATIVA RÁPIDA sin instalar nada:
 * Puedes tomar cualquier imagen PNG de 512×512 y nombrarla:
 *   icon-192.png  (redimensionada a 192×192)
 *   icon-512.png  (512×512)
 *
 * Los iconos deben colocarse en: public/icons/
 */

// Para generar iconos de forma rápida sin dependencias externas,
// se incluyen como base64 directamente en el manifest via vite-plugin-pwa.
// Los archivos icon-192.png e icon-512.png deben generarse manualmente
// o usando una herramienta como https://realfavicongenerator.net

console.log('Coloca tus iconos PNG en esta carpeta:');
console.log('  public/icons/icon-192.png  (192×192 px)');
console.log('  public/icons/icon-512.png  (512×512 px)');
