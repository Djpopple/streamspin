interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
  size?: 'sm' | 'md'
}

export function Toggle({ label, checked, onChange, description, size = 'md' }: ToggleProps) {
  const track = size === 'sm'
    ? 'w-8 h-4'
    : 'w-10 h-5'
  const thumb = size === 'sm'
    ? 'w-3 h-3 top-0.5'
    : 'w-4 h-4 top-0.5'
  const translate = size === 'sm'
    ? (checked ? 'translate-x-4' : 'translate-x-0.5')
    : (checked ? 'translate-x-5' : 'translate-x-0.5')

  return (
    <label className="flex items-center justify-between cursor-pointer select-none gap-3">
      <div className="min-w-0">
        <span className="text-sm text-white/80 leading-tight">{label}</span>
        {description && (
          <p className="text-xs text-white/35 leading-tight mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`${track} rounded-full relative shrink-0 transition-colors duration-200 ${
          checked ? 'bg-accent' : 'bg-white/20'
        }`}
      >
        <span
          className={`absolute ${thumb} bg-white rounded-full shadow transition-transform duration-200 ${translate}`}
        />
      </button>
    </label>
  )
}
