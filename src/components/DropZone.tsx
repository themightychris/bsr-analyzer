import { useRef, useState } from 'react'

type Props = {
  label: string
  hint?: string
  onFile: (file: File) => void
  className?: string
}

export function DropZone({ label, hint, onFile, className = '' }: Props) {
  const [hovering, setHovering] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  function handleFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return
    const file = Array.from(files).find((f) => f.name.toLowerCase().endsWith('.gpx'))
    if (!file) return
    onFile(file)
  }

  return (
    <div
      className={`rounded-xl border-2 border-dashed transition-colors ${
        hovering
          ? 'border-emerald-400 bg-emerald-400/5'
          : 'border-neutral-700 bg-neutral-900/40 hover:border-neutral-500'
      } ${className}`}
      onDragOver={(e) => {
        e.preventDefault()
        setHovering(true)
      }}
      onDragLeave={() => setHovering(false)}
      onDrop={(e) => {
        e.preventDefault()
        setHovering(false)
        handleFiles(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".gpx,application/gpx+xml,application/xml,text/xml"
        aria-label={label}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <div className="text-base font-medium text-white">{label}</div>
        {hint && <div className="text-sm text-neutral-400">{hint}</div>}
        <div className="text-xs text-neutral-500">drag &amp; drop a .gpx file or click to browse</div>
      </div>
    </div>
  )
}
