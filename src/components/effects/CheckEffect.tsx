// ============================================================
// CheckEffect — screen shake quand le roi est en échec
// ============================================================

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '@/store/useGameStore'

export function CheckEffect() {
  const checkedKingSquare = useGameStore((s) => s.checkedKingSquare)
  const { camera } = useThree()

  const shakeRef = useRef({
    active: false,
    intensity: 0,
    duration: 0,
    elapsed: 0,
    origin: camera.position.clone(),
  })

  // Déclencher le shake quand checkedKingSquare devient non-null
  useEffect(() => {
    if (!checkedKingSquare) return
    shakeRef.current = {
      active: true,
      intensity: 0.10,
      duration: 0.45,
      elapsed: 0,
      origin: camera.position.clone(),
    }
  }, [checkedKingSquare])

  useFrame((_, delta) => {
    const shake = shakeRef.current
    if (!shake.active) return

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
  })

  return null
}
