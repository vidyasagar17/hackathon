import { BrowserRouter, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import DecimalWarPage from './pages/DecimalWarPage'
import ForKeepsPage from './pages/ForKeepsPage'
import LandingPage from './pages/LandingPage'
import PracticePage from './pages/PracticePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/practice/:gameId" element={<PracticePage />} />
        <Route path="/curriculum/decimal-war" element={<DecimalWarPage />} />
        <Route path="/curriculum/for-keeps" element={<ForKeepsPage />} />
        <Route path="/summary" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
