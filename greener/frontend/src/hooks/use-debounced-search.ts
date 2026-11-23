import { useEffect, useState } from 'react'
import { SEARCH_DEBOUNCE_MS } from '@/lib/dashboard-filters'

export function useDebouncedSearch(
  value: string,
  onCommit: (value: string) => void,
  delayMs: number = SEARCH_DEBOUNCE_MS,
) {
  const [text, setText] = useState(value)
  const [synced, setSynced] = useState(value)
  const [committed, setCommitted] = useState(value)

  if (synced !== value) {
    setSynced(value)
    if (value !== committed) {
      setText(value)
      setCommitted(value)
    }
  }

  useEffect(() => {
    const next = text.trim()
    if (next === committed) return
    const id = setTimeout(() => {
      setCommitted(next)
      onCommit(next)
    }, delayMs)
    return () => clearTimeout(id)
  }, [text, committed, onCommit, delayMs])

  return [text, setText] as const
}
