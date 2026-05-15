import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Environment } from './effects/Environment'
import { PostProcessing } from './effects/PostProcessing'
import { Camera } from './effects/Camera'
import { useGameStore } from '@/store/useGameStore'

function SceneContent() {
  const playerColor = useGameStore((s) => s.playerColor)

  return (
    <>
      <Environment />
      <Camera playerColor={playerColor} />

      {/* Placeholder plateau — remplacé Phase 3 commit 3 */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial
          color="#1a1210"
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

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
        toneMapping: 2, // ACESFilmicToneMapping
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
