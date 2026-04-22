import { Link } from 'react-router-dom'
import SearchBar from './SearchBar'

interface HeaderProps {
  searchInitialValue?: string
}

export default function Header({ searchInitialValue }: HeaderProps) {
  return (
    <header
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <Link
        to="/"
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--gold)',
          textDecoration: 'none',
          letterSpacing: '0.5px',
        }}
      >
        🍳 Let Chat Cook
      </Link>
      <SearchBar initialValue={searchInitialValue} />
    </header>
  )
}
