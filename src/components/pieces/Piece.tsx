import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSpring, animated } from '@react-spring/three'
import type { Group } from 'three'
import * as THREE from 'three'
import type { PieceSymbol, Color, Square } from 'chess.js'
import { useGameStore } from '@/store/useGameStore'
import { PieceGeometry } from './PieceGeometry'
import { usePieceAnimation } from '@/hooks/usePieceAnimation'

interface PieceProps {
  type: PieceSymbol
  color: Color
  square: Square
  position: [number, number, number]
}

export function Piece({ type, color, square, position }: PieceProps) {
  const rotationRef = useRef<Group>(null)
  const { selectedSquare, selectSquare, phase } = useGameStore()
  const isSelected = selectedSquare === square
  const isWhite = color === 'w'

  // Hook animation déplacement
  const { groupRef } = usePieceAnimation({ square, targetPosition: position })

  const { scale } = useSpring({
    scale: isSelected ? 1.08 : 1.0,
    config: { tension: 280, friction: 24 },
  })

  // Rotation lente sur sélection
  useFrame(({ clock }) => {
    if (!rotationRef.current) return
    if (isSelected) {
      rotationRef.current.rotation.y = clock.getElapsedTime() * 0.8
    } else {
      rotationRef.current.rotation.y += (0 - rotationRef.current.rotation.y) * 0.06
    }
  })

  const material = useMemo(() => {
    if (isWhite) {
      return new THREE.MeshStandardMaterial({
        color: '#f0e8d0',
        roughness: isSelected ? 0.15 : 0.25,
        metalness: isSelected ? 0.10 : 0.08,
        emissive: isSelected ? new THREE.Color('#c89a30') : new THREE.Color('#000000'),
        emissiveIntensity: isSelected ? 0.5 : 0,
        envMapIntensity: isSelected ? 2.0 : 1.2,
      })
    }
    return new THREE.MeshStandardMaterial({
      color: '#1a0e08',
      roughness: isSelected ? 0.10 : 0.18,
      metalness: isSelected ? 0.50 : 0.35,
      emissive: isSelected ? new THREE.Color('#c89a30') : new THREE.Color('#000000'),
      emissiveIntensity: isSelected ? 0.5 : 0,
      envMapIntensity: isSelected ? 2.5 : 1.8,
    })
  }, [isWhite, isSelected])

  return (
    <group
      ref={groupRef}
      position={position}
    >
      <animated.group
        scale={scale}
        onClick={(e) => {
          e.stopPropagation()
          if (phase === 'playing') selectSquare(square)
        }}
      >
        <group ref={rotationRef}>
          <PieceGeometry type={type} material={material} />
        </group>

        {isSelected && (
          <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.38, 32]} />
            <meshBasicMaterial
              color="#c89a30"
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        )}
      </animated.group>
    </group>
  )
}
