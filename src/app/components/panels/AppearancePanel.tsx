import type { WheelAppearance } from '@shared/config'
import { Panel } from '../ui/Panel'
import { Slider } from '../ui/Slider'
import { ColorInput } from '../ui/ColorInput'
import { Toggle } from '../ui/Toggle'
import { FontSelect } from '../ui/FontSelect'
import { FONTS } from '../../lib/constants'

interface Props {
  wheel: WheelAppearance
  onChange: (wheel: WheelAppearance) => void
}

export function AppearancePanel({ wheel, onChange }: Props) {
  const set = <K extends keyof WheelAppearance>(key: K, val: WheelAppearance[K]) =>
    onChange({ ...wheel, [key]: val })

  return (
    <Panel title="Appearance">
      {/* Background */}
      <div>
        <p className="label">Background</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set('backgroundColor', 'transparent')}
            className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
              wheel.backgroundColor === 'transparent'
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Transparent
          </button>
          <button
            type="button"
            onClick={() => set('backgroundColor', '#000000')}
            className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
              wheel.backgroundColor !== 'transparent'
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Solid
          </button>
          {wheel.backgroundColor !== 'transparent' && (
            <ColorInput
              value={wheel.backgroundColor}
              onChange={v => set('backgroundColor', v)}
            />
          )}
        </div>
      </div>

      {/* Border */}
      <div className="space-y-2">
        <Slider
          label="Border width"
          value={wheel.borderWidth}
          min={0} max={16} step={1} unit="px"
          onChange={v => set('borderWidth', v)}
        />
        {wheel.borderWidth > 0 && (
          <ColorInput
            label="Border colour"
            value={wheel.borderColor}
            onChange={v => set('borderColor', v)}
          />
        )}
      </div>

      {/* Hub */}
      <div className="space-y-2">
        <Slider
          label="Hub size"
          value={wheel.hubSize}
          min={0} max={80} step={2} unit="px"
          onChange={v => set('hubSize', v)}
        />
        {wheel.hubSize > 0 && (
          <ColorInput
            label="Hub colour"
            value={wheel.hubColor}
            onChange={v => set('hubColor', v)}
          />
        )}
      </div>

      {/* Font */}
      <FontSelect
        label="Font"
        value={wheel.globalFont}
        options={FONTS}
        onChange={(v: string) => set('globalFont', v)}
      />

      <Slider
        label="Label size"
        value={wheel.globalFontSize}
        min={8} max={48} step={1} unit="px"
        onChange={v => set('globalFontSize', v)}
      />

      {/* Glow */}
      <div className="space-y-2">
        <Toggle
          label="Glow effect"
          checked={wheel.glowEnabled}
          onChange={v => set('glowEnabled', v)}
          size="sm"
        />
        {wheel.glowEnabled && (
          <>
            <ColorInput
              label="Glow colour"
              value={wheel.glowColor}
              onChange={v => set('glowColor', v)}
            />
            <Slider
              label="Glow intensity"
              value={wheel.glowIntensity}
              min={2} max={40} step={1} unit="px"
              onChange={v => set('glowIntensity', v)}
            />
          </>
        )}
      </div>

      {/* Shadow */}
      <Toggle
        label="Drop shadow"
        checked={wheel.shadowEnabled}
        onChange={v => set('shadowEnabled', v)}
        size="sm"
      />

      {/* Label style */}
      <div>
        <p className="label">Label style</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set('labelBold', !wheel.labelBold)}
            className={`flex-1 text-sm py-1.5 rounded-md border font-bold transition-colors ${
              wheel.labelBold
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => set('labelItalic', !wheel.labelItalic)}
            className={`flex-1 text-sm py-1.5 rounded-md border italic transition-colors ${
              wheel.labelItalic
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Italic
          </button>
        </div>
      </div>

      {/* Frame ring */}
      <Slider
        label="Frame ring width"
        value={wheel.framePadding}
        min={20} max={160} step={4} unit="px"
        onChange={v => set('framePadding', v)}
      />
      <p className="text-white/25 text-xs -mt-1">
        Space between wheel rim and canvas edge — for frame artwork overlays.
      </p>

      {/* Frame overlay */}
      <div className="space-y-2">
        <Toggle
          label="Frame overlay"
          description="Artist PNG rendered on top of the wheel"
          checked={wheel.frameEnabled}
          onChange={v => set('frameEnabled', v)}
          size="sm"
        />
        {wheel.frameEnabled && (
          <label className={`flex items-center gap-2 cursor-pointer rounded-md border-2 border-dashed p-3 transition-colors ${
            wheel.frameImageDataUrl ? 'border-accent/50 bg-accent/5' : 'border-white/15 hover:border-white/30'
          }`}>
            <input
              type="file"
              accept="image/png,image/webp"
              className="sr-only"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = ev => {
                  const dataUrl = ev.target?.result as string
                  set('frameImageDataUrl', dataUrl)
                }
                reader.readAsDataURL(file)
                e.target.value = ''
              }}
            />
            {wheel.frameImageDataUrl ? (
              <span className="text-xs text-white/60">Frame loaded — click to replace</span>
            ) : (
              <span className="text-xs text-white/40">Click to upload frame PNG…</span>
            )}
          </label>
        )}
        {wheel.frameEnabled && wheel.frameImageDataUrl && (
          <button
            type="button"
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
            onClick={() => { set('frameImageDataUrl', undefined); set('frameEnabled', false) }}
          >
            ✕ Remove frame
          </button>
        )}
        <p className="text-white/25 text-xs">
          Design a square PNG with transparent centre — see docs for artist spec.
        </p>
      </div>
    </Panel>
  )
}
