import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Environment } from './effects/Environment'
import { PostProcessing } from './effects/PostProcessing'
import { Camera } from './effects/Camera'
import { Board } from './board/Board'
import { useGameStore } from '@/store/useGameStore'

function SceneContent() {
  const playerColor = useGameStore((s) => s.playerColor)

  return (
    <>
      <Environment />
      <Camera playerColor={playerColor} />
      <Board />
      <PostProcessing />
    </>
  )
}

export function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 10, 9], fov: 42 }}
      gl={{
        antialias: true,
        toneMapping: 2,
        toneMappingExposure: 1.2,
        powerPreference: 'high-performance',
      }}
      style={{ width: '100vw', height: '100vh' }}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  )
}
