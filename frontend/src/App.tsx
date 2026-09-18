import { BrowserRouter, Route, Routes } from 'react-router-dom'
import CardWarPage from './pages/CardWarPage'
import ClockMatchPage from './pages/ClockMatchPage'
import CoordinateBattleshipPage from './pages/CoordinateBattleshipPage'
import CoverTheNumberPage from './pages/CoverTheNumberPage'
import DashboardPage from './pages/DashboardPage'
import DecimalWarPage from './pages/DecimalWarPage'
import DontBreakTheBankPage from './pages/DontBreakTheBankPage'
import ForKeepsPage from './pages/ForKeepsPage'
import FourInARowPage from './pages/FourInARowPage'
import FractionSpoonsPage from './pages/FractionSpoonsPage'
import LandingPage from './pages/LandingPage'
import MultiplicationShootoutPage from './pages/MultiplicationShootoutPage'
import PracticePage from './pages/PracticePage'
import ShutTheBoxPage from './pages/ShutTheBoxPage'
import TargetNumberPage from './pages/TargetNumberPage'
import TwentyFourPage from './pages/TwentyFourPage'
import VolumeBuilderPage from './pages/VolumeBuilderPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/practice/:gameId" element={<PracticePage />} />
        <Route path="/curriculum/decimal-war" element={<DecimalWarPage />} />
        <Route path="/curriculum/for-keeps" element={<ForKeepsPage />} />
        <Route path="/curriculum/dont-break-the-bank" element={<DontBreakTheBankPage />} />
        <Route path="/curriculum/target-number" element={<TargetNumberPage />} />
        <Route path="/curriculum/clock-match" element={<ClockMatchPage />} />
        <Route path="/curriculum/fraction-spoons" element={<FractionSpoonsPage />} />
        <Route path="/curriculum/the-24-game" element={<TwentyFourPage />} />
        <Route path="/curriculum/coordinate-plane-battleship" element={<CoordinateBattleshipPage />} />
        <Route path="/curriculum/volume-builder" element={<VolumeBuilderPage />} />
        <Route path="/curriculum/multiplication-shootout" element={<MultiplicationShootoutPage />} />
        <Route path="/curriculum/addition-war" element={<CardWarPage game="addition-war" />} />
        <Route path="/curriculum/take-away-war" element={<CardWarPage game="take-away-war" />} />
        <Route path="/curriculum/shut-the-box" element={<ShutTheBoxPage />} />
        <Route path="/curriculum/four-in-a-row" element={<FourInARowPage />} />
        <Route path="/curriculum/cover-the-number" element={<CoverTheNumberPage />} />
        <Route path="/summary" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
