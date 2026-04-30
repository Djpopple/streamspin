const KEY = 'ss_recentColors'
const MAX = 8

export function getRecentColors(): string[] {
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? (JSON.parse(stored) as string[]) : []
  } catch {
    return []
  }
}

export function addRecentColor(hex: string): void {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return
  const norm = hex.toLowerCase()
  const filtered = getRecentColors().filter(c => c !== norm)
  filtered.unshift(norm)
  localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)))
}
