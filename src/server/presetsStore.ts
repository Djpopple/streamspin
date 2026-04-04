// Reads and writes presets.json atomically.
// Presets are named snapshots of WheelConfig that users can save and reload.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import type { WheelConfig } from '../types/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PRESETS_PATH = path.join(__dirname, '../../presets.json')
const TMP_PATH = PRESETS_PATH + '.tmp'

export interface Preset {
  id: string
  name: string
  config: WheelConfig
  savedAt: string
}

export type PresetSummary = Omit<Preset, 'config'>

interface PresetsFile {
  presets: Preset[]
}

function read(): PresetsFile {
  if (!fs.existsSync(PRESETS_PATH)) return { presets: [] }
  return JSON.parse(fs.readFileSync(PRESETS_PATH, 'utf-8')) as PresetsFile
}

function write(data: PresetsFile): void {
  fs.writeFileSync(TMP_PATH, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(TMP_PATH, PRESETS_PATH)
}

export function listPresets(): PresetSummary[] {
  return read().presets.map(({ id, name, savedAt }) => ({ id, name, savedAt }))
}

export function getPreset(id: string): Preset | null {
  return read().presets.find(p => p.id === id) ?? null
}

export function createPreset(name: string, config: WheelConfig): Preset {
  const data = read()
  const preset: Preset = { id: randomUUID(), name, config, savedAt: new Date().toISOString() }
  data.presets.push(preset)
  write(data)
  return preset
}

export function updatePreset(id: string, updates: { name?: string; config?: WheelConfig }): Preset | null {
  const data = read()
  const idx = data.presets.findIndex(p => p.id === id)
  if (idx === -1) return null
  data.presets[idx] = { ...data.presets[idx], ...updates, savedAt: new Date().toISOString() }
  write(data)
  return data.presets[idx]
}

export function deletePreset(id: string): boolean {
  const data = read()
  const before = data.presets.length
  data.presets = data.presets.filter(p => p.id !== id)
  if (data.presets.length === before) return false
  write(data)
  return true
}
