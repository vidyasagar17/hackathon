import { BrowserRouter, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import PracticePage from './pages/PracticePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/practice/:gameId" element={<PracticePage />} />
        <Route path="/summary" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
