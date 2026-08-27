import { useEffect, useState } from 'react'

export function detectTouchInput(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  return navigator.maxTouchPoints > 0
    || window.matchMedia('(any-pointer: coarse)').matches
}

/** Capability detection for tablets and hybrid devices. User-agent detection
 * is deliberately avoided so iPadOS desktop mode and touch laptops work too. */
export function useHasTouchInput(): boolean {
  const [hasTouchInput, setHasTouchInput] = useState(detectTouchInput)

  useEffect(() => {
    const media = window.matchMedia('(any-pointer: coarse)')
    const update = () => setHasTouchInput(detectTouchInput())
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return hasTouchInput
}
