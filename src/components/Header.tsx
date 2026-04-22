import SearchBar from './SearchBar'

interface HeaderProps {
  searchInitialValue?: string
}

export default function Header({ searchInitialValue }: HeaderProps) {
  return (
    <header style={{
      background: 'var(--bg-dark)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <a href="/" style={{
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '24px',
        fontWeight: 700,
        color: '#fff',
        textDecoration: 'none',
        letterSpacing: '-0.5px',
        textShadow: '0 2px 0 var(--orange-dark)',
      }}>
        🍳 Let Chat Cook
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--text-muted)',
          marginLeft: '10px',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          textShadow: 'none',
          verticalAlign: 'middle',
        }}>Global Stats</span>
      </a>
      <SearchBar initialValue={searchInitialValue} />
    </header>
  )
}
