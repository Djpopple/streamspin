// Reads and writes config.json atomically.
// All server code that needs config goes through here — never read config.json directly.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { WheelConfig } from '../types/config.js'
import { DEFAULT_CONFIG } from '../types/config.js'
import { migrateConfig } from './migration.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.join(__dirname, '../../config.json')
const TMP_PATH = CONFIG_PATH + '.tmp'

let cached: WheelConfig | null = null

export function readConfig(): WheelConfig {
  if (cached) return cached
  if (!fs.existsSync(CONFIG_PATH)) {
    writeConfig(DEFAULT_CONFIG)
    return DEFAULT_CONFIG
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  const migrated = migrateConfig(JSON.parse(raw))
  cached = migrated
  return cached
}

export function writeConfig(config: WheelConfig): void {
  const json = JSON.stringify(config, null, 2)
  fs.writeFileSync(TMP_PATH, json, 'utf-8')
  fs.renameSync(TMP_PATH, CONFIG_PATH)
  cached = config
}

export function updateConfig(partial: Partial<WheelConfig>): WheelConfig {
  const current = readConfig()
  const updated = { ...current, ...partial }
  writeConfig(updated)
  return updated
}
