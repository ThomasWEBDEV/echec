// ============================================================
// usePieceAnimation — arc parabolique cinématique
// Chaque déplacement de pièce suit une courbe en cloche
// hauteur proportionnelle à la distance parcourue
// ============================================================

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Square } from 'chess.js'
import { useGameStore } from '@/store/useGameStore'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const BOARD_OFFSET = -3.5

function squareToVec3(square: Square, isFlipped: boolean, y = 0.08): THREE.Vector3 {
  const file = FILES.indexOf(square[0])
  const rank = parseInt(square[1]) - 1
  const col = isFlipped ? 7 - file : file
  const row = isFlipped ? rank : 7 - rank
  return new THREE.Vector3(col + BOARD_OFFSET, y, row + BOARD_OFFSET)
}

interface UsePieceAnimationProps {
  square: Square
  targetPosition: [number, number, number]
}

export function usePieceAnimation({ square, targetPosition }: UsePieceAnimationProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { lastMove, isFlipped } = useGameStore()

  // État de l'animation
  const animState = useRef({
    isAnimating: false,
    progress: 0,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    arcHeight: 0,
    duration: 0.5,
  })

  // Détecter quand cette pièce doit se déplacer
  useEffect(() => {
    if (!lastMove) return
    if (lastMove.to !== square) return
    if (!groupRef.current) return

    const anim = animState.current
    const isFlippedVal = isFlipped

    // Position de départ — là où la pièce était
    anim.from.copy(squareToVec3(lastMove.from, isFlippedVal))

    // Position d'arrivée
    anim.to.copy(squareToVec3(lastMove.to, isFlippedVal))

    // Hauteur de l'arc — proportionnelle à la distance
    const dist = anim.from.distanceTo(anim.to)
    anim.arcHeight = Math.min(0.8 + dist * 0.15, 2.2)

    // Durée — plus longue pour les grandes distances
    anim.duration = Math.min(0.3 + dist * 0.04, 0.65)

    anim.progress = 0
    anim.isAnimating = true

    // Positionner immédiatement au départ
    groupRef.current.position.copy(anim.from)
  }, [lastMove, square, isFlipped])

  useFrame((_, delta) => {
    const anim = animState.current
    if (!anim.isAnimating || !groupRef.current) return

    // Avancer la progression
    anim.progress += delta / anim.duration
    if (anim.progress >= 1) {
      anim.progress = 1
      anim.isAnimating = false
    }

    // Courbe ease — in-out cubique
    const t = anim.progress
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    // Position interpolée
    const pos = new THREE.Vector3().lerpVectors(anim.from, anim.to, eased)

    // Arc parabolique — sin donne une cloche parfaite
    pos.y += Math.sin(eased * Math.PI) * anim.arcHeight

    groupRef.current.position.copy(pos)

    // Légère rotation pendant le vol
    groupRef.current.rotation.x = Math.sin(eased * Math.PI) * -0.3
  })

  return { groupRef }
}
