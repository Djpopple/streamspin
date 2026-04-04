// Shared constants for the editor UI

export const SEGMENT_COLORS = [
  '#e94560', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f43f5e', '#a855f7', '#84cc16',
  '#fbbf24', '#10b981', '#6366f1', '#ffffff',
]

export const FONTS = [
  { label: 'Inter (Default)',  value: 'Inter, sans-serif' },
  { label: 'Oswald',          value: 'Oswald, sans-serif' },
  { label: 'Bebas Neue',      value: '"Bebas Neue", sans-serif' },
  { label: 'Bangers',         value: 'Bangers, cursive' },
  { label: 'Poppins',         value: 'Poppins, sans-serif' },
  { label: 'Nunito',          value: 'Nunito, sans-serif' },
  { label: 'Arial',           value: 'Arial, sans-serif' },
  { label: 'Georgia',         value: 'Georgia, serif' },
  { label: 'Impact',          value: 'Impact, sans-serif' },
  { label: 'Verdana',         value: 'Verdana, sans-serif' },
  { label: 'Courier New',     value: '"Courier New", monospace' },
  { label: 'Comic Sans MS',   value: '"Comic Sans MS", cursive' },
  { label: 'Times New Roman',  value: '"Times New Roman", serif' },
  { label: 'Permanent Marker', value: '"Permanent Marker", cursive' },
  { label: 'Ravie',            value: 'Ravie, cursive' },
  { label: 'Bradley Hand ITC', value: '"Bradley Hand ITC", cursive' },
  { label: 'CC Zoinks',        value: '"CC Zoinks", cursive' },
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
