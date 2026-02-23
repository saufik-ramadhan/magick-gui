interface OutputDirPickerProps {
  value: string
  onChange: (dir: string) => void
  label?: string
  placeholder?: string
}

export default function OutputDirPicker({
  value,
  onChange,
  label = 'Output Folder',
  placeholder = 'Same as source file (default)'
}: OutputDirPickerProps): JSX.Element {
  const handleBrowse = async (): Promise<void> => {
    const dir = await window.magickAPI.openDirectory()
    if (dir) onChange(dir)
  }

  return (
    <div>
      <label className="label-base">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={value}
          placeholder={placeholder}
          className="input-base cursor-default"
          onClick={handleBrowse}
          title={value || placeholder}
        />
        <button
          type="button"
          onClick={handleBrowse}
          className="btn-secondary shrink-0 text-sm"
        >
          Browse
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-white/30 hover:text-accent transition-colors text-sm px-2"
            title="Reset to default"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
