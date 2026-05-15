import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

const CAMERA_POSITIONS = {
  white: new THREE.Vector3(0, 10, 9),
  black: new THREE.Vector3(0, 10, -9),
}

const CAMERA_TARGET = new THREE.Vector3(0, 0, 0)

export function Camera({ playerColor = 'white' }: { playerColor?: 'white' | 'black' }) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()

  useFrame(() => {
    const target = CAMERA_POSITIONS[playerColor]
    camera.position.lerp(target, 0.04)
    camera.lookAt(CAMERA_TARGET)
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={7}
      maxDistance={18}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.4}
      target={CAMERA_TARGET}
      dampingFactor={0.05}
      enableDamping
    />
  )
}
