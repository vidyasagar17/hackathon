import { BrowserRouter, Route, Routes } from 'react-router-dom'
import CardWarPage from './pages/CardWarPage'
import DashboardPage from './pages/DashboardPage'
import DecimalWarPage from './pages/DecimalWarPage'
import ForKeepsPage from './pages/ForKeepsPage'
import FractionSpoonsPage from './pages/FractionSpoonsPage'
import LandingPage from './pages/LandingPage'
import MultiplicationShootoutPage from './pages/MultiplicationShootoutPage'
import PracticePage from './pages/PracticePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/practice/:gameId" element={<PracticePage />} />
        <Route path="/curriculum/decimal-war" element={<DecimalWarPage />} />
        <Route path="/curriculum/for-keeps" element={<ForKeepsPage />} />
        <Route path="/curriculum/fraction-spoons" element={<FractionSpoonsPage />} />
        <Route path="/curriculum/multiplication-shootout" element={<MultiplicationShootoutPage />} />
        <Route path="/curriculum/addition-war" element={<CardWarPage game="addition-war" />} />
        <Route path="/curriculum/take-away-war" element={<CardWarPage game="take-away-war" />} />
        <Route path="/summary" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
