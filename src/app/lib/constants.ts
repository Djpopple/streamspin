// Shared constants for the editor UI

// Full 18-colour palette shown in the picker dropdown.
// Ordered warm → greens → cools → blues → purples → utility neutrals.
export const SEGMENT_COLORS = [
  '#E53935', // Red
  '#FB8C00', // Orange
  '#FBC02D', // Amber / Gold
  '#FFEB3B', // Yellow
  '#C0CA33', // Lime
  '#43A047', // Green
  '#00897B', // Teal
  '#00ACC1', // Cyan
  '#42A5F5', // Sky Blue
  '#1E88E5', // Blue
  '#0D47A1', // Deep Blue / Navy
  '#3949AB', // Indigo
  '#8E24AA', // Purple
  '#D81B60', // Pink / Magenta
  '#6D4C41', // Brown
  '#757575', // Gray
  '#212121', // Near-Black
  '#FFFFFF', // White
]

// Subset used when auto-assigning colours to new segments.
// Excludes white (white text on white segment = invisible).
const CYCLE_COLORS = SEGMENT_COLORS.filter(c => c !== '#FFFFFF')

export const FONTS = [
  // Sans-serif — clean
  { label: 'Inter (Default)',   value: 'Inter, sans-serif' },
  { label: 'Arial',             value: 'Arial, sans-serif' },
  { label: 'Verdana',           value: 'Verdana, sans-serif' },
  { label: 'Montserrat',        value: 'Montserrat, sans-serif' },
  { label: 'Poppins',           value: 'Poppins, sans-serif' },
  { label: 'Nunito',            value: 'Nunito, sans-serif' },
  { label: 'Fredoka',           value: 'Fredoka, sans-serif' },
  // Condensed / bold impact
  { label: 'Bebas Neue',        value: '"Bebas Neue", sans-serif' },
  { label: 'Oswald',            value: 'Oswald, sans-serif' },
  { label: 'Teko',              value: 'Teko, sans-serif' },
  { label: 'Russo One',         value: '"Russo One", sans-serif' },
  { label: 'Righteous',         value: 'Righteous, sans-serif' },
  { label: 'Impact',            value: 'Impact, sans-serif' },
  // Display / decorative
  { label: 'Bangers',           value: 'Bangers, cursive' },
  { label: 'Lobster',           value: 'Lobster, cursive' },
  { label: 'Pacifico',          value: 'Pacifico, cursive' },
  { label: 'Abril Fatface',     value: '"Abril Fatface", cursive' },
  { label: 'Alfa Slab One',     value: '"Alfa Slab One", serif' },
  { label: 'Lilita One',        value: '"Lilita One", cursive' },
  // Handwriting / casual
  { label: 'Permanent Marker',  value: '"Permanent Marker", cursive' },
  { label: 'Comic Sans MS',     value: '"Comic Sans MS", cursive' },
  { label: 'Caveat',            value: 'Caveat, cursive' },
  { label: 'Kalam',             value: 'Kalam, cursive' },
  { label: 'Satisfy',           value: 'Satisfy, cursive' },
  { label: 'Dancing Script',    value: '"Dancing Script", cursive' },
  // Serif / elegant
  { label: 'Georgia',           value: 'Georgia, serif' },
  { label: 'Times New Roman',   value: '"Times New Roman", serif' },
  { label: 'Playfair Display',  value: '"Playfair Display", serif' },
  { label: 'Cinzel',            value: 'Cinzel, serif' },
  // Gaming / tech
  { label: 'Orbitron',          value: 'Orbitron, sans-serif' },
  { label: 'Exo 2',             value: '"Exo 2", sans-serif' },
  { label: 'Press Start 2P',    value: '"Press Start 2P", monospace' },
  // Monospace
  { label: 'Courier New',       value: '"Courier New", monospace' },
  // Special / custom
  { label: 'Bradley Hand ITC',  value: '"Bradley Hand ITC", cursive' },
  { label: 'Ravie',             value: 'Ravie, cursive' },
  { label: 'CC Zoinks',         value: '"CC Zoinks", cursive' },
]

export const EASING_OPTIONS = [
  { label: 'Smooth (cubic)',   value: 'ease-out-cubic' },
  { label: 'Snappy (quint)',   value: 'ease-out-quint' },
  { label: 'Sharp (expo)',     value: 'ease-out-expo' },
] as const

export function generateId(): string {
  return crypto.randomUUID()
}

export function cycleColor(index: number): string {
  return CYCLE_COLORS[index % CYCLE_COLORS.length]
}
