import { Scene } from './components/Scene'
import { Menu } from './components/ui/Menu'
import { HUD } from './components/ui/HUD'
import { GameOver } from './components/ui/GameOver'

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#04060c' }}>
      <Scene />
      <Menu />
      <HUD />
      <GameOver />
    </div>
  )
}
