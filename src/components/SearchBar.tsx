import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

interface SearchBarProps {
  initialValue?: string
}

export default function SearchBar({ initialValue = '' }: SearchBarProps) {
  const [value, setValue] = useState(initialValue)
  const navigate = useNavigate()

  useEffect(() => {
    setValue(initialValue ?? '')
  }, [initialValue])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) {
      navigate(`/player/${encodeURIComponent(trimmed.toLowerCase())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Search player by Twitch username..."
        style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          color: 'var(--text)',
          fontSize: '14px',
          width: '280px',
        }}
      />
      <button
        type="submit"
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius)',
          border: 'none',
          background: 'var(--gold-dim)',
          color: '#1a1a2e',
          fontWeight: 700,
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        Search
      </button>
    </form>
  )
}
