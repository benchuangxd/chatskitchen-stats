import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LeaderboardPage from './pages/LeaderboardPage'
import PlayerPage from './pages/PlayerPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LeaderboardPage />} />
        <Route path="/player/:username" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
