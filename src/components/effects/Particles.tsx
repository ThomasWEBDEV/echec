// ============================================================
// Particles — poussière dorée ambiante en suspension
// ============================================================

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 120

export function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useRef(new THREE.Object3D())

  const particles = useMemo(() => {
    return Array.from({ length: COUNT }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 6,
        (Math.random() - 0.5) * 12,
      ),
      speed: 0.08 + Math.random() * 0.12,
      offset: Math.random() * Math.PI * 2,
      radius: 0.02 + Math.random() * 0.03,
      rotSpeed: (Math.random() - 0.5) * 2,
    }))
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    particles.forEach((p, i) => {
      // Mouvement flottant — sinusoïdal lent
      dummy.current.position.set(
        p.position.x + Math.sin(t * p.speed + p.offset) * 0.3,
        p.position.y + Math.sin(t * p.speed * 0.7 + p.offset) * 0.4,
        p.position.z + Math.cos(t * p.speed + p.offset) * 0.3,
      )

      dummy.current.scale.setScalar(p.radius)
      dummy.current.rotation.y = t * p.rotSpeed
      dummy.current.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.current.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#f0c060"
        emissive="#c89a30"
        emissiveIntensity={0.8}
        roughness={0.1}
        metalness={0.9}
        transparent
        opacity={0.7}
      />
    </instancedMesh>
  )
}
