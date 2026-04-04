import type { ResultDisplay } from '@shared/config'
import { Panel } from '../ui/Panel'
import { Slider } from '../ui/Slider'
import { Toggle } from '../ui/Toggle'
import { ColorInput } from '../ui/ColorInput'
import { Select } from '../ui/Select'
import { FONTS } from '../../lib/constants'

interface Props {
  result: ResultDisplay
  onChange: (result: ResultDisplay) => void
}

export function ResultPanel({ result, onChange }: Props) {
  const set = <K extends keyof ResultDisplay>(key: K, val: ResultDisplay[K]) =>
    onChange({ ...result, [key]: val })

  return (
    <Panel title="Result Overlay" defaultOpen={false}>
      <Toggle
        label="Show result after spin"
        checked={result.enabled}
        onChange={v => set('enabled', v)}
        size="sm"
      />

      {result.enabled && (
        <>
          <Slider
            label="Display duration"
            value={result.duration / 1000}
            min={1} max={15} step={0.5} decimals={1} unit="s"
            onChange={v => set('duration', v * 1000)}
          />

          <div>
            <p className="label">Message template</p>
            <input
              type="text"
              value={result.messageTemplate}
              onChange={e => set('messageTemplate', e.target.value)}
              className="input text-sm"
              placeholder="{winner}"
            />
            <p className="text-xs text-white/30 mt-1">Use <code className="text-accent/80">{'{winner}'}</code> for the segment label</p>
          </div>

          {/* Background */}
          <div className="space-y-2">
            <ColorInput
              label="Background colour"
              value={result.backgroundColor}
              onChange={v => set('backgroundColor', v)}
            />
            <Slider
              label="Background opacity"
              value={Math.round(result.backgroundOpacity * 100)}
              min={0} max={100} step={5} unit="%"
              onChange={v => set('backgroundOpacity', v / 100)}
            />
          </div>

          {/* Text */}
          <Select
            label="Font"
            value={result.font}
            options={FONTS}
            onChange={v => set('font', v)}
          />
          <Slider
            label="Font size"
            value={result.fontSize}
            min={16} max={120} step={2} unit="px"
            onChange={v => set('fontSize', v)}
          />
          <ColorInput
            label="Text colour"
            value={result.textColor}
            onChange={v => set('textColor', v)}
          />

          {/* Preview */}
          <div
            className="rounded-lg p-4 text-center"
            style={{
              background: `${result.backgroundColor}${Math.round(result.backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
              fontFamily: result.font,
              fontSize: Math.min(result.fontSize, 32),
              color: result.textColor,
            }}
          >
            {result.messageTemplate.replace('{winner}', 'Prize 1')}
          </div>
        </>
      )}
    </Panel>
  )
}
