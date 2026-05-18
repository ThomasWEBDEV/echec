import { Stars } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

export function Environment() {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#04060c', 0.035)
    return () => { scene.fog = null }
  }, [scene])

  return (
    <>
      {/* Lumière principale — dorée, dramatique */}
      <directionalLight
        position={[5, 12, 5]}
        intensity={2.5}
        color="#ffe4a0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
      />

      {/* Lumière ambiante */}
      <ambientLight intensity={0.4} color="#a0a8c0" />

      {/* Lumière de remplissage — froide */}
      <directionalLight
        position={[-8, 6, -6]}
        intensity={0.6}
        color="#a0c0ff"
      />

      {/* Rim light doré */}
      <pointLight
        position={[0, 2, -8]}
        intensity={1.2}
        color="#c89a30"
        distance={20}
      />

      {/* Lumière sous le plateau — lueur mystérieuse */}
      <pointLight
        position={[0, -2, 0]}
        intensity={0.4}
        color="#c89a30"
        distance={10}
      />

      <Stars
        radius={80}
        depth={50}
        count={3000}
        factor={3}
        saturation={0.3}
        fade
        speed={0.3}
      />
    </>
  )
}
