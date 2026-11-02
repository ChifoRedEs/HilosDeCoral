// Avatares de Catapulta: qué dibujo lleva cada clase de proyectil y cada enemigo. Las imágenes están en img/catapulta/
// (av-<id>-1…4: normal, divisible, acelerador, bomba · en-<id>: enemigo · mosaico-<id>: miniatura de 🎨 Apariencia).
export const CLASES = ['normal', 'divisible', 'acelerador', 'bomba'];

export const AVATARES = {
  pajaros: { nombre: 'Pájaros', icono: '🐦', aves: ['Gallina', 'Crías de pingüino', 'Halcón peregrino', 'Pavo real'], enemigo: 'Cerdo ibérico capitán' },
  acuaticos: { nombre: 'Acuáticos', icono: '🌊', aves: ['Erizo de mar', 'Banco de sardinas', 'Pez espada', 'Pez globo'], enemigo: 'Cangrejo pirata' },
  minerales: { nombre: 'Minerales', icono: '🪨', aves: ['Canto rodado', 'Geoda', 'Meteorito', 'Roca de lava'], enemigo: 'Golem de roca' },
  piratas: { nombre: 'Piratas', icono: '🏴‍☠️', aves: ['Bala de cañón', 'Saco de monedas', 'Botella con cohete', 'Barril de pólvora'], enemigo: 'Esqueleto pirata' },
  objetos: { nombre: 'Objetos', icono: '🧰', aves: ['Pelota de playa', 'Bolsa de canicas', 'Cohete de feria', 'Globo de agua'], enemigo: 'Robot de hojalata' },
  vegetales: { nombre: 'Vegetales', icono: '🍉', aves: ['Calabaza', 'Racimo de uvas', 'Pimiento picante', 'Sandía'], enemigo: 'Oruga glotona' },
};
export const IDS = Object.keys(AVATARES);
export const valido = id => (AVATARES[id] ? id : 'pajaros');
export const imgAve = (set, clase) => `av-${valido(set)}-${CLASES.indexOf(clase) + 1}`;
export const imgEnemigo = set => `en-${valido(set)}`;
export const nombreAve = (set, clase) => AVATARES[valido(set)].aves[CLASES.indexOf(clase)];
export const imgPieza = (set, i) => `av-${valido(set)}-2-div-${i + 1}`;      // las 3 piezas del proyectil divisible al activar la habilidad
