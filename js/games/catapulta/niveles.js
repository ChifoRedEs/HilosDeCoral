// Niveles de Catapulta. Coordenadas del mundo lógico 900×540; el suelo está en y = 480.
// Ayudantes: B(material, centroX, base, ancho, alto) · P(centroX, base, radio) — «base» es la y de la parte inferior.
export const B = (m, x, base, w, h) => ({ m, x, y: base - h / 2, w, h });
export const P = (x, base, r = 27) => ({ x, y: base - r, r });
const S = 480;

export const NIVELES = [
  { nombre: 'Primer asalto', aves: ['normal', 'normal', 'normal'], est: [12000, 19000],
    bloques: [B('madera', 620, S, 16, 70), B('madera', 720, S, 16, 70), B('madera', 670, S - 70, 130, 14)],
    cerdos: [P(670, S), P(670, S - 84)] },
  { nombre: 'Casa de hielo', aves: ['normal', 'normal', 'divisible', 'normal'], est: [20000, 32000],
    bloques: [B('hielo', 590, S, 16, 60), B('hielo', 710, S, 16, 60), B('madera', 650, S - 60, 160, 14), B('piedra', 820, S, 40, 40)],
    cerdos: [P(650, S), P(650, S - 74), P(820, S - 40)] },
  { nombre: 'Fortín de piedra', aves: ['normal', 'acelerador', 'acelerador', 'divisible'], est: [18000, 24000],
    bloques: [B('piedra', 600, S, 20, 80), B('piedra', 700, S, 20, 80), B('piedra', 650, S - 80, 150, 16),
      B('madera', 620, S - 96, 14, 50), B('madera', 680, S - 96, 14, 50), B('madera', 650, S - 146, 100, 14)],
    cerdos: [P(650, S), P(650, S - 160), P(780, S)] },
  { nombre: 'Tres torres', aves: ['normal', 'bomba', 'divisible', 'acelerador', 'normal'], est: [30000, 41000],
    bloques: [B('hierro', 560, S, 40, 40), B('madera', 560, S - 40, 40, 40),
      B('piedra', 680, S, 40, 40), B('hielo', 680, S - 40, 40, 40), B('madera', 680, S - 80, 40, 40),
      B('piedra', 800, S, 40, 40), B('hielo', 800, S - 40, 40, 40)],
    cerdos: [P(560, S - 80), P(680, S - 120), P(800, S - 80)] },
  { nombre: 'La fortaleza pirata', aves: ['normal', 'divisible', 'acelerador', 'bomba', 'bomba'], est: [26000, 37000],
    bloques: [B('piedra', 560, S, 18, 70), B('hierro', 640, S, 18, 70), B('hierro', 720, S, 18, 70), B('piedra', 800, S, 18, 70),
      B('madera', 600, S - 70, 120, 14), B('madera', 760, S - 70, 120, 14),
      B('hielo', 570, S - 84, 14, 50), B('hielo', 630, S - 84, 14, 50), B('madera', 600, S - 134, 100, 14),
      B('hielo', 760, S - 84, 40, 40)],
    cerdos: [P(600, S), P(760, S), P(600, S - 148), P(760, S - 124)] },
];

export const validarNivel = n => Number.isInteger(n) && n >= 1 && n <= NIVELES.length;
