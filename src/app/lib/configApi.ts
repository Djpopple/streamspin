import type { WheelConfig } from '@shared/config'

export async function fetchConfig(): Promise<WheelConfig> {
  const res = await fetch('/api/config')
  if (!res.ok) throw new Error(`Failed to load config: ${res.status}`)
  return res.json() as Promise<WheelConfig>
}

export async function saveConfig(config: WheelConfig): Promise<void> {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) throw new Error(`Failed to save config: ${res.status}`)
}

export function exportConfig(config: WheelConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `streamspin-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importConfig(file: File): Promise<WheelConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as WheelConfig
        if (typeof parsed.version !== 'number') throw new Error('Missing version field')
        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}
