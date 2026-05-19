// ============================================================
// CheckEffect — screen shake + glow rouge sur le roi en échec
// ============================================================

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/useGameStore'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const BOARD_OFFSET = -3.5

function squareToVec3(square: string, isFlipped: boolean): THREE.Vector3 {
  const file = FILES.indexOf(square[0])
  const rank = parseInt(square[1]) - 1
  const col = isFlipped ? 7 - file : file
  const row = isFlipped ? rank : 7 - rank
  return new THREE.Vector3(col + BOARD_OFFSET, 0.5, row + BOARD_OFFSET)
}

export function CheckEffect() {
  const { lastAnimationEvent, clearAnimationEvent, isFlipped, isInCheck } = useGameStore()
  const { camera } = useThree()

  const shakeRef = useRef({
    active: false,
    intensity: 0,
    duration: 0,
    elapsed: 0,
    origin: camera.position.clone(),
  })

  const glowRef = useRef<THREE.Mesh>(null)
  const glowPositionRef = useRef<THREE.Vector3 | null>(null)

  // Déclencher le shake sur échec
  useEffect(() => {
    if (!lastAnimationEvent) return
    if (lastAnimationEvent.type !== 'check' && lastAnimationEvent.type !== 'checkmate') return

    // Screen shake
    shakeRef.current = {
      active: true,
      intensity: lastAnimationEvent.type === 'checkmate' ? 0.18 : 0.10,
      duration: lastAnimationEvent.type === 'checkmate' ? 0.8 : 0.45,
      elapsed: 0,
      origin: camera.position.clone(),
    }

    // Position du glow
    glowPositionRef.current = squareToVec3(lastAnimationEvent.kingSquare, isFlipped)

    clearAnimationEvent()
  }, [lastAnimationEvent])

  useFrame((_, delta) => {
    const shake = shakeRef.current

    // ── Screen shake ────────────────────────────────────
    if (shake.active) {
      shake.elapsed += delta
      const progress = shake.elapsed / shake.duration

      if (progress >= 1) {
        shake.active = false
        camera.position.copy(shake.origin)
      } else {
        const decay = 1 - progress
        const freq = 40
        camera.position.x = shake.origin.x + Math.sin(shake.elapsed * freq) * shake.intensity * decay
        camera.position.y = shake.origin.y + Math.sin(shake.elapsed * freq * 1.3) * shake.intensity * decay * 0.5
        camera.position.z = shake.origin.z + Math.cos(shake.elapsed * freq * 0.9) * shake.intensity * decay
      }
    }

    // ── Glow pulsé sur le roi ────────────────────────────
    if (!glowRef.current) return

    if (isInCheck && glowPositionRef.current) {
      glowRef.current.visible = true
      glowRef.current.position.copy(glowPositionRef.current)
      const pulse = Math.sin(Date.now() * 0.006) * 0.3 + 0.7
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = pulse * 0.5
      glowRef.current.scale.setScalar(pulse * 1.2)
    } else {
      glowRef.current.visible = false
    }
  })

  return (
    <mesh ref={glowRef} visible={false}>
      <sphereGeometry args={[0.6, 16, 16]} />
      <meshBasicMaterial
        color="#c0283c"
        transparent
        opacity={0.4}
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  )
}
