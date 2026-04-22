import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LeaderboardPage from './pages/LeaderboardPage'
import PlayerPage from './pages/PlayerPage'

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
      <h2>Page not found</h2>
      <p><a href="/">← Back to Leaderboard</a></p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LeaderboardPage />} />
        <Route path="/player/:username" element={<PlayerPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
