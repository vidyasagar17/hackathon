import { BrowserRouter, Route, Routes } from 'react-router-dom'
import CardWarPage from './pages/CardWarPage'
import CoordinateBattleshipPage from './pages/CoordinateBattleshipPage'
import DashboardPage from './pages/DashboardPage'
import DecimalWarPage from './pages/DecimalWarPage'
import DontBreakTheBankPage from './pages/DontBreakTheBankPage'
import ForKeepsPage from './pages/ForKeepsPage'
import FractionSpoonsPage from './pages/FractionSpoonsPage'
import LandingPage from './pages/LandingPage'
import MultiplicationShootoutPage from './pages/MultiplicationShootoutPage'
import PracticePage from './pages/PracticePage'
import ShutTheBoxPage from './pages/ShutTheBoxPage'
import TwentyFourPage from './pages/TwentyFourPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/practice/:gameId" element={<PracticePage />} />
        <Route path="/curriculum/decimal-war" element={<DecimalWarPage />} />
        <Route path="/curriculum/for-keeps" element={<ForKeepsPage />} />
        <Route path="/curriculum/dont-break-the-bank" element={<DontBreakTheBankPage />} />
        <Route path="/curriculum/fraction-spoons" element={<FractionSpoonsPage />} />
        <Route path="/curriculum/the-24-game" element={<TwentyFourPage />} />
        <Route path="/curriculum/coordinate-plane-battleship" element={<CoordinateBattleshipPage />} />
        <Route path="/curriculum/multiplication-shootout" element={<MultiplicationShootoutPage />} />
        <Route path="/curriculum/addition-war" element={<CardWarPage game="addition-war" />} />
        <Route path="/curriculum/take-away-war" element={<CardWarPage game="take-away-war" />} />
        <Route path="/curriculum/shut-the-box" element={<ShutTheBoxPage />} />
        <Route path="/summary" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
