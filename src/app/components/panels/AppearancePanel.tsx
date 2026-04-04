import type { WheelAppearance } from '@shared/config'
import { Panel } from '../ui/Panel'
import { Slider } from '../ui/Slider'
import { ColorInput } from '../ui/ColorInput'
import { Toggle } from '../ui/Toggle'
import { Select } from '../ui/Select'
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
      <Select
        label="Font"
        value={wheel.globalFont}
        options={FONTS}
        onChange={v => set('globalFont', v)}
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
    </Panel>
  )
}
