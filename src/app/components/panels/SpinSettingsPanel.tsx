import { useRef } from 'react'
import type { SpinPhysics, SoundConfig } from '@shared/config'
import { Panel } from '../ui/Panel'
import { Slider } from '../ui/Slider'
import { Toggle } from '../ui/Toggle'
import { Select } from '../ui/Select'
import { EASING_OPTIONS } from '../../lib/constants'

interface Props {
  spin: SpinPhysics
  sound: SoundConfig
  onSpinChange: (spin: SpinPhysics) => void
  onSoundChange: (sound: SoundConfig) => void
}

function AudioUpload({
  label,
  enabled,
  volume,
  dataUrl,
  onToggle,
  onVolume,
  onUpload,
}: {
  label: string
  enabled: boolean
  volume: number
  dataUrl?: string
  onToggle: (v: boolean) => void
  onVolume: (v: number) => void
  onUpload: (dataUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onUpload(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/10">
      <Toggle label={label} checked={enabled} onChange={onToggle} size="sm" />
      {enabled && (
        <>
          <div className="flex items-center gap-2">
            <label className="btn-secondary text-xs px-3 py-1.5 cursor-pointer">
              {dataUrl ? 'Replace' : 'Upload MP3/WAV'}
              <input ref={inputRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
            </label>
            {dataUrl && (
              <audio controls src={dataUrl} className="h-8 flex-1 min-w-0" />
            )}
          </div>
          <Slider
            label="Volume"
            value={Math.round(volume * 100)}
            min={0} max={100} step={5} unit="%"
            onChange={v => onVolume(v / 100)}
          />
        </>
      )}
    </div>
  )
}

export function SpinSettingsPanel({ spin, sound, onSpinChange, onSoundChange }: Props) {
  const setSpin = <K extends keyof SpinPhysics>(key: K, val: SpinPhysics[K]) =>
    onSpinChange({ ...spin, [key]: val })

  const setSound = <K extends keyof SoundConfig>(key: K, val: SoundConfig[K]) =>
    onSoundChange({ ...sound, [key]: val })

  return (
    <Panel title="Spin & Sound" defaultOpen={false}>
      {/* Duration */}
      <div className="space-y-2">
        <p className="label">Duration range</p>
        <Slider
          label="Min"
          value={spin.durationMin / 1000}
          min={1} max={20} step={0.5} decimals={1} unit="s"
          onChange={v => setSpin('durationMin', Math.min(v * 1000, spin.durationMax))}
        />
        <Slider
          label="Max"
          value={spin.durationMax / 1000}
          min={1} max={30} step={0.5} decimals={1} unit="s"
          onChange={v => setSpin('durationMax', Math.max(v * 1000, spin.durationMin))}
        />
      </div>

      {/* Rotations */}
      <div className="space-y-2">
        <p className="label">Rotations range</p>
        <Slider
          label="Min"
          value={spin.rotationsMin}
          min={1} max={20} step={1}
          onChange={v => setSpin('rotationsMin', Math.min(v, spin.rotationsMax))}
        />
        <Slider
          label="Max"
          value={spin.rotationsMax}
          min={1} max={30} step={1}
          onChange={v => setSpin('rotationsMax', Math.max(v, spin.rotationsMin))}
        />
      </div>

      {/* Easing */}
      <Select
        label="Easing"
        value={spin.easing}
        options={[...EASING_OPTIONS]}
        onChange={v => setSpin('easing', v as SpinPhysics['easing'])}
      />

      {/* Bounce */}
      <Toggle
        label="Bounce on stop"
        description="Slight overshoot effect at the end"
        checked={spin.bounce}
        onChange={v => setSpin('bounce', v)}
        size="sm"
      />
      {spin.bounce && (
        <Slider
          label="Bounce intensity"
          value={spin.bounceIntensity}
          min={0.1} max={1} step={0.1} decimals={1}
          onChange={v => setSpin('bounceIntensity', v)}
        />
      )}

      {/* Audio */}
      <AudioUpload
        label="Spin start sound"
        enabled={sound.spinStartEnabled}
        volume={sound.spinStartVolume}
        dataUrl={sound.spinStartDataUrl}
        onToggle={v => setSound('spinStartEnabled', v)}
        onVolume={v => setSound('spinStartVolume', v)}
        onUpload={url => onSoundChange({ ...sound, spinStartEnabled: true, spinStartDataUrl: url })}
      />
      <AudioUpload
        label="Win sound"
        enabled={sound.winEnabled}
        volume={sound.winVolume}
        dataUrl={sound.winDataUrl}
        onToggle={v => setSound('winEnabled', v)}
        onVolume={v => setSound('winVolume', v)}
        onUpload={url => onSoundChange({ ...sound, winEnabled: true, winDataUrl: url })}
      />
    </Panel>
  )
}
