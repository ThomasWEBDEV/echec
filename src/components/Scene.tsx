import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Environment } from './effects/Environment'
import { PostProcessing } from './effects/PostProcessing'
import { Camera } from './effects/Camera'
import { ChessScene } from './pieces/ChessModel'
import { CaptureEffect } from './effects/CaptureEffect'
import { CheckEffect } from './effects/CheckEffect'
import { Particles } from './effects/Particles'
import { useGameStore } from '@/store/useGameStore'
import { useStockfish } from '@/engine/useStockfish'

function SceneContent() {
  const playerColor = useGameStore((s) => s.playerColor)
  useStockfish()

  return (
    <>
      <Environment />
      <Camera playerColor={playerColor} />
      <Particles />
      <Suspense fallback={null}>
        <ChessScene />
      </Suspense>
      <CaptureEffect />
      <CheckEffect />
      <PostProcessing />
    </>
  )
}

export function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 14, 7], fov: 42 }}
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
