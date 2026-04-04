import { useEffect, useRef } from 'react'
import type { PointerConfig, PointerPreset, PointerPosition } from '@shared/config'
import { Panel } from '../ui/Panel'
import { Slider } from '../ui/Slider'
import { ColorInput } from '../ui/ColorInput'
import { POINTER_PRESETS } from '../../../wheel/pointers'

interface Props {
  pointer: PointerConfig
  onChange: (pointer: PointerConfig) => void
}

const PRESETS: { value: Exclude<PointerPreset, 'custom'>; label: string }[] = [
  { value: 'arrow',    label: 'Arrow'    },
  { value: 'triangle', label: 'Triangle' },
  { value: 'pin',      label: 'Pin'      },
  { value: 'gem',      label: 'Gem'      },
  { value: 'hand',     label: 'Hand'     },
]

const POSITIONS: { value: PointerPosition; label: string }[] = [
  { value: 'top',    label: '↓ Top'    },
  { value: 'right',  label: '← Right'  },
  { value: 'bottom', label: '↑ Bottom' },
  { value: 'left',   label: '→ Left'   },
]

function PresetCanvas({ preset, color, active }: {
  preset: Exclude<PointerPreset, 'custom'>
  color: string
  active: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 52, 52)
    ctx.save()
    ctx.translate(26, 26)
    POINTER_PRESETS[preset](ctx, 22, color)
    ctx.restore()
  }, [preset, color])

  return (
    <div
      className={`rounded-lg border-2 p-1 transition-colors ${
        active ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/30'
      }`}
    >
      <canvas ref={ref} width={52} height={52} />
    </div>
  )
}

export function PointerPanel({ pointer, onChange }: Props) {
  const set = <K extends keyof PointerConfig>(key: K, val: PointerConfig[K]) =>
    onChange({ ...pointer, [key]: val })

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      // Resize to max 256×256 before storing
      const img = new Image()
      img.onload = () => {
        const MAX = 256
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        onChange({ ...pointer, preset: 'custom', customImageDataUrl: canvas.toDataURL('image/png') })
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <Panel title="Pointer">
      {/* Preset grid */}
      <div>
        <p className="label">Preset</p>
        <div className="grid grid-cols-5 gap-1.5">
          {PRESETS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              title={label}
              onClick={() => set('preset', value)}
            >
              <PresetCanvas
                preset={value}
                color={pointer.colorTint ?? '#ffffff'}
                active={pointer.preset === value}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Custom image upload */}
      <div>
        <p className="label">Custom image</p>
        <label className={`flex items-center gap-2 cursor-pointer rounded-md border-2 border-dashed p-3 transition-colors ${
          pointer.preset === 'custom' ? 'border-accent/50 bg-accent/5' : 'border-white/15 hover:border-white/30'
        }`}>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCustomUpload} className="sr-only" />
          {pointer.preset === 'custom' && pointer.customImageDataUrl ? (
            <>
              <img src={pointer.customImageDataUrl} alt="Custom pointer" className="w-8 h-8 object-contain" />
              <span className="text-xs text-white/60">Custom pointer active</span>
            </>
          ) : (
            <span className="text-xs text-white/40">Click to upload PNG/JPG…</span>
          )}
        </label>
        {pointer.preset === 'custom' && (
          <button
            type="button"
            className="text-xs text-white/30 hover:text-white/60 mt-1 transition-colors"
            onClick={() => onChange({ ...pointer, preset: 'arrow', customImageDataUrl: undefined })}
          >
            ✕ Remove custom
          </button>
        )}
      </div>

      {/* Position */}
      <div>
        <p className="label">Position</p>
        <div className="grid grid-cols-2 gap-1.5">
          {POSITIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('position', value)}
              className={`text-xs py-1.5 px-2 rounded-md border transition-colors ${
                pointer.position === value
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scale */}
      <Slider
        label="Scale"
        value={pointer.scale}
        min={0.5} max={3} step={0.1} decimals={1} unit="×"
        onChange={v => set('scale', v)}
      />

      {/* Colour tint (SVG presets only) */}
      {pointer.preset !== 'custom' && (
        <ColorInput
          label="Colour tint"
          value={pointer.colorTint ?? '#ffffff'}
          onChange={v => set('colorTint', v)}
        />
      )}
    </Panel>
  )
}
