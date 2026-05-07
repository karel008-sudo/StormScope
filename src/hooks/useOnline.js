import { useEffect, useState } from 'react'

/**
 * Live navigator.onLine subscription. Returns true when the browser thinks
 * the device is online, false otherwise. Updates on the standard online /
 * offline window events.
 */
export function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onUp = () => setOnline(true)
    const onDown = () => setOnline(false)
    window.addEventListener('online', onUp)
    window.addEventListener('offline', onDown)
    return () => {
      window.removeEventListener('online', onUp)
      window.removeEventListener('offline', onDown)
    }
  }, [])
  return online
}
