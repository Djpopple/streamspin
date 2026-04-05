// In-memory win history with optional persistence to history.json.
// Capped at MAX_HISTORY entries (oldest dropped first).

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { WinRecord } from '../types/events.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HISTORY_PATH = path.join(__dirname, '../../history.json')
const TMP_PATH = HISTORY_PATH + '.tmp'
const MAX_HISTORY = 200

let history: WinRecord[] = loadFromDisk()

function loadFromDisk(): WinRecord[] {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      const raw = fs.readFileSync(HISTORY_PATH, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as WinRecord[]
    }
  } catch {
    // Corrupted file — start fresh
  }
  return []
}

function saveToDisk(): void {
  try {
    fs.writeFileSync(TMP_PATH, JSON.stringify(history, null, 2), 'utf-8')
    fs.renameSync(TMP_PATH, HISTORY_PATH)
  } catch {
    // Non-fatal — history is still in memory
  }
}

export function addWin(record: WinRecord): void {
  history.unshift(record) // newest first
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY)
  saveToDisk()
}

export function getHistory(): WinRecord[] {
  return history
}

export function removeWin(id: string): boolean {
  const before = history.length
  history = history.filter(r => r.id !== id)
  if (history.length !== before) { saveToDisk(); return true }
  return false
}

export function updateWin(id: string, label: string, triggeredBy: string): WinRecord | null {
  const record = history.find(r => r.id === id)
  if (!record) return null
  record.label = label.trim()
  record.triggeredBy = triggeredBy.trim()
  saveToDisk()
  return record
}

export function clearHistory(): void {
  history = []
  saveToDisk()
}
