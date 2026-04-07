// Shared constants for the editor UI

export const SEGMENT_COLORS = [
  '#e94560', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f43f5e', '#a855f7', '#84cc16',
  '#fbbf24', '#10b981', '#6366f1', '#ffffff',
]

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
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length]
}
