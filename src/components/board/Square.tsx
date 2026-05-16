import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import * as THREE from 'three'
import type { Square as ChessSquare } from 'chess.js'
import { useGameStore } from '@/store/useGameStore'

interface SquareProps {
  square: ChessSquare
  isLight: boolean
  position: [number, number, number]
  isSelected: boolean
  isLegalMove: boolean
  isLastMove: boolean
  isInCheck: boolean
}

// Couleurs des cases
const COLOR_LIGHT       = new THREE.Color('#c8a87a')
const COLOR_DARK        = new THREE.Color('#6b3a1e')
const COLOR_SELECTED    = new THREE.Color('#e8c840')
const COLOR_LEGAL       = new THREE.Color('#a0d080')
const COLOR_LAST_MOVE   = new THREE.Color('#d4a020')
const COLOR_CHECK       = new THREE.Color('#c0283c')

export function Square({
  square,
  isLight,
  position,
  isSelected,
  isLegalMove,
  isLastMove,
  isInCheck,
}: SquareProps) {
  const meshRef = useRef<Mesh>(null)
  const { selectSquare } = useGameStore()

  // Calculer la couleur finale de la case
  const baseColor = useMemo(() => {
    if (isSelected) return COLOR_SELECTED
    if (isLegalMove) return isLight
      ? COLOR_LIGHT.clone().lerp(COLOR_LEGAL, 0.5)
      : COLOR_DARK.clone().lerp(COLOR_LEGAL, 0.5)
    if (isLastMove) return isLight
      ? COLOR_LIGHT.clone().lerp(COLOR_LAST_MOVE, 0.4)
      : COLOR_DARK.clone().lerp(COLOR_LAST_MOVE, 0.4)
    return isLight ? COLOR_LIGHT : COLOR_DARK
  }, [isLight, isSelected, isLegalMove, isLastMove])

  // Animation pulse sur la case sélectionnée
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    if (isSelected) {
      const pulse = Math.sin(clock.getElapsedTime() * 4) * 0.08 + 0.92
      mat.emissiveIntensity = pulse * 0.3
    } else if (isInCheck) {
      const pulse = Math.sin(clock.getElapsedTime() * 6) * 0.15 + 0.85
      mat.emissiveIntensity = pulse * 0.4
    } else {
      mat.emissiveIntensity = isLegalMove ? 0.12 : 0
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      receiveShadow
      onClick={() => selectSquare(square)}
    >
      <boxGeometry args={[1, 0.06, 1]} />
      <meshStandardMaterial
        color={baseColor}
        roughness={isLight ? 0.6 : 0.8}
        metalness={isLight ? 0.05 : 0.02}
        emissive={isSelected ? COLOR_SELECTED : isInCheck ? COLOR_CHECK : COLOR_LEGAL}
        emissiveIntensity={0}
      />

      {/* Point de coup légal */}
      {isLegalMove && (
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
          <meshStandardMaterial
            color="#a0d080"
            emissive="#a0d080"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </mesh>
  )
}
