// ============================================================
// CaptureEffect — explosion de particules dorées
// Déclenché à chaque capture de pièce
// ============================================================

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/useGameStore'

const PARTICLE_COUNT = 32

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  scale: number
}

function createParticles(origin: THREE.Vector3): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2
    const elevation = (Math.random() - 0.3) * Math.PI
    const speed = 1.5 + Math.random() * 3.0

    return {
      position: origin.clone(),
      velocity: new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.abs(Math.sin(elevation)) * speed + 1.0,
        Math.sin(angle) * Math.cos(elevation) * speed,
      ),
      life: 1.0,
      maxLife: 0.6 + Math.random() * 0.6,
      scale: 0.04 + Math.random() * 0.08,
    }
  })
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const BOARD_OFFSET = -3.5

function squareToVec3(square: string, isFlipped: boolean): THREE.Vector3 {
  const file = FILES.indexOf(square[0])
  const rank = parseInt(square[1]) - 1
  const col = isFlipped ? 7 - file : file
  const row = isFlipped ? rank : 7 - rank
  return new THREE.Vector3(col + BOARD_OFFSET, 0.3, row + BOARD_OFFSET)
}

export function CaptureEffect() {
  const { lastAnimationEvent, clearAnimationEvent, isFlipped } = useGameStore()
  const [particles, setParticles] = useState<Particle[]>([])
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useRef(new THREE.Object3D())

  // Déclencher l'effet sur chaque capture
  useEffect(() => {
    if (!lastAnimationEvent) return
    if (lastAnimationEvent.type !== 'capture' && lastAnimationEvent.type !== 'en-passant') return

    const origin = squareToVec3(lastAnimationEvent.to, isFlipped)
    setParticles(createParticles(origin))
    clearAnimationEvent()
  }, [lastAnimationEvent])

  useFrame((_, delta) => {
    if (!meshRef.current || particles.length === 0) return

    let alive = 0
    particles.forEach((p, i) => {
      p.life -= delta / p.maxLife
      if (p.life <= 0) return

      // Physique simple — gravité
      p.velocity.y -= delta * 4.0
      p.position.addScaledVector(p.velocity, delta)

      // Mettre à jour l'instance
      dummy.current.position.copy(p.position)
      const s = p.scale * Math.max(p.life, 0)
      dummy.current.scale.setScalar(s)
      dummy.current.rotation.x += delta * 3
      dummy.current.rotation.z += delta * 2
      dummy.current.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.current.matrix)
      alive++
    })

    meshRef.current.instanceMatrix.needsUpdate = true

    // Nettoyer quand toutes les particules sont mortes
    if (alive === 0 && particles.length > 0) {
      setParticles([])
    }
  })

  if (particles.length === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#f0c060"
        emissive="#c89a30"
        emissiveIntensity={1.2}
        roughness={0.2}
        metalness={0.8}
      />
    </instancedMesh>
  )
}
