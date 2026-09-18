import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { GAMES, gameId } from '../gameCatalog'
import { INTROS } from '../intros'
import GameIntro from './GameIntro'

/**
 * Shows a game's intro before the game itself, every time the game is opened. The game page only mounts when the
 * student presses Play, so no round is dealt (or logged) for a student who reads the intro and goes back home.
 * The gate remembers Play for this address only, so opening another game shows that game's intro.
 */
export default function IntroGate() {
  const { pathname } = useLocation()
  const [playingPath, setPlayingPath] = useState<string | null>(null)
  const game = GAMES.find((entry) => entry.to === pathname)
  const intro = game && INTROS[gameId(game)]

  if (!game || !intro || playingPath === pathname) return <Outlet />

  const play = () => {
    setPlayingPath(pathname)
    window.scrollTo({ top: 0 })
  }

  return <GameIntro key={pathname} game={game} intro={intro} onPlay={play} />
}
