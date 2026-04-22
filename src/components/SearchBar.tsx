import { useState, useRef } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

interface SearchBarProps {
  initialValue?: string
}

export default function SearchBar({ initialValue = '' }: SearchBarProps) {
  const [value, setValue] = useState(initialValue)
  const navigate = useNavigate()

  const prevInitialRef = useRef(initialValue)
  if (prevInitialRef.current !== initialValue) {
    prevInitialRef.current = initialValue
    setValue(initialValue ?? '')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) {
      navigate(`/player/${encodeURIComponent(trimmed.toLowerCase())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '6px' }}>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Search player..."
        style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '8px 12px',
          color: 'var(--text)',
          fontFamily: "'Space Mono', monospace",
          fontSize: '13px',
          width: '180px',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
      <button type="submit" style={{
        background: 'var(--orange)',
        border: 'none',
        borderRadius: 'var(--radius)',
        padding: '8px 14px',
        color: '#fff',
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '16px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'filter 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
      onMouseLeave={e => (e.currentTarget.style.filter = '')}
      >→</button>
    </form>
  )
}
