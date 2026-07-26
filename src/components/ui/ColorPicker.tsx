import { useEffect, useRef, useState } from 'react'
import { hexToHsv, hsvToHex, isValidHex, type Hsv } from '@/lib/color'
import { cn } from '@/lib/cn'

interface ColorPickerProps {
  value: string
  /** Fired continuously while dragging — cheap, local-only updates. */
  onChange?: (hex: string) => void
  /** Fired once the user releases the pointer / commits a value. */
  onChangeEnd: (hex: string) => void
  className?: string
}

// Drag handling here is done with our own pointermove math (no native
// <input type="color"> widget involved), so tracking is exactly as smooth
// as the browser's compositor allows — no ticked/throttled redraws.
export function ColorPicker({ value, onChange, onChangeEnd, className }: ColorPickerProps) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value))
  const [hexInput, setHexInput] = useState(value)
  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'sv' | 'hue' | null>(null)

  useEffect(() => {
    setHsv(hexToHsv(value))
    setHexInput(value)
  }, [value])

  const commit = (next: Hsv) => {
    setHsv(next)
    const hex = hsvToHex(next)
    setHexInput(hex)
    onChange?.(hex)
  }

  const updateFromSv = (clientX: number, clientY: number) => {
    const el = svRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const s = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * 100
    const v = 100 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)) * 100
    commit({ ...hsv, s, v })
  }

  const updateFromHue = (clientX: number) => {
    const el = hueRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const h = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * 360
    commit({ ...hsv, h })
  }

  const endDrag = () => {
    if (!draggingRef.current) return
    draggingRef.current = null
    onChangeEnd(hsvToHex(hsv))
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (draggingRef.current === 'sv') updateFromSv(e.clientX, e.clientY)
      else if (draggingRef.current === 'hue') updateFromHue(e.clientX)
    }
    const onUp = () => endDrag()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hsv])

  const hueColor = hsvToHex({ h: hsv.h, s: 100, v: 100 })

  return (
    <div className={cn('flex flex-col gap-2.5 w-52', className)}>
      <div
        ref={svRef}
        onPointerDown={(e) => {
          draggingRef.current = 'sv'
          updateFromSv(e.clientX, e.clientY)
        }}
        className="relative h-32 w-full cursor-crosshair rounded-md select-none touch-none"
        style={{
          backgroundColor: hueColor,
          backgroundImage:
            'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
        }}
      >
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: hsvToHex(hsv) }}
        />
      </div>

      <div
        ref={hueRef}
        onPointerDown={(e) => {
          draggingRef.current = 'hue'
          updateFromHue(e.clientX)
        }}
        className="relative h-3 w-full cursor-pointer select-none touch-none rounded-full"
        style={{
          background:
            'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
        }}
      >
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: hueColor }}
        />
      </div>

      <input
        value={hexInput}
        onChange={(e) => setHexInput(e.target.value)}
        onBlur={() => {
          if (isValidHex(hexInput)) {
            const next = hexToHsv(hexInput)
            setHsv(next)
            onChangeEnd(hsvToHex(next))
          } else {
            setHexInput(hsvToHex(hsv))
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        maxLength={7}
        spellCheck={false}
        className="w-full rounded-md border border-border-subtle bg-bg-tertiary px-2 py-1 text-center text-xs uppercase text-text-primary outline-none focus:border-accent/50"
      />
    </div>
  )
}
