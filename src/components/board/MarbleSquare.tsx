import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, ShaderMaterial } from 'three'
import * as THREE from 'three'
import type { Square as ChessSquare } from 'chess.js'
import { useGameStore } from '@/store/useGameStore'
import vertexShader from '@/shaders/board/marble.vert'
import fragmentShader from '@/shaders/board/marble.frag'

interface MarbleSquareProps {
  square: ChessSquare
  isLight: boolean
  position: [number, number, number]
  isSelected: boolean
  isLegalMove: boolean
  isLastMove: boolean
  isInCheck: boolean
}

export function MarbleSquare({
  square,
  isLight,
  position,
  isSelected,
  isLegalMove,
  isLastMove,
  isInCheck,
}: MarbleSquareProps) {
  const meshRef = useRef<Mesh>(null)
  const matRef = useRef<ShaderMaterial>(null)
  const { selectSquare } = useGameStore()

  const uniforms = useMemo(() => ({
    uTime:    { value: 0 },
    uScale:   { value: isLight ? 2.2 : 1.8 },
    uColorA:  { value: isLight
      ? new THREE.Color('#d4bfa0')  // marbre ivoire clair
      : new THREE.Color('#1a0e08')  // obsidienne sombre
    },
    uColorB:  { value: isLight
      ? new THREE.Color('#f0e8d8')  // veines blanches
      : new THREE.Color('#3a1a0a')  // veines brun sombre
    },
    uHighlight:    { value: 0.0 },
    uHighlightColor: { value: new THREE.Color('#e8c840') },
  }), [isLight])

  useFrame(({ clock }) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = clock.getElapsedTime()

    // Highlight animé selon l'état de la case
    let targetHighlight = 0.0
    if (isSelected) {
      targetHighlight = Math.sin(clock.getElapsedTime() * 4) * 0.15 + 0.55
      matRef.current.uniforms.uHighlightColor.value.set('#e8c840')
    } else if (isInCheck) {
      targetHighlight = Math.sin(clock.getElapsedTime() * 6) * 0.2 + 0.5
      matRef.current.uniforms.uHighlightColor.value.set('#c0283c')
    } else if (isLegalMove) {
      targetHighlight = 0.25
      matRef.current.uniforms.uHighlightColor.value.set('#80c060')
    } else if (isLastMove) {
      targetHighlight = 0.2
      matRef.current.uniforms.uHighlightColor.value.set('#d4a020')
    }

    matRef.current.uniforms.uHighlight.value +=
      (targetHighlight - matRef.current.uniforms.uHighlight.value) * 0.08
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      receiveShadow
      onClick={() => selectSquare(square)}
    >
      <boxGeometry args={[1, 0.06, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />

      {/* Point coup légal */}
      {isLegalMove && (
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.02, 24]} />
          <meshStandardMaterial
            color="#80c060"
            emissive="#80c060"
            emissiveIntensity={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </mesh>
  )
}
