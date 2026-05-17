import { useMemo } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { MarbleSquare } from './MarbleSquare'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

export const SQUARE_SIZE = 1
export const BOARD_OFFSET = -3.5

export function Board() {
  const { selectedSquare, legalMoves, lastMove, isInCheck, isFlipped } = useGameStore()

  const squares = useMemo(() => {
    const result = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const fileIdx = isFlipped ? 7 - col : col
        const rankIdx = isFlipped ? 7 - row : row
        const square = `${FILES[fileIdx]}${RANKS[rankIdx]}`
        const isLight = (row + col) % 2 === 0
        const x = col * SQUARE_SIZE + BOARD_OFFSET
        const z = row * SQUARE_SIZE + BOARD_OFFSET
        result.push({ square, isLight, x, z })
      }
    }
    return result
  }, [isFlipped])

  return (
    <group name="board">
      <mesh receiveShadow position={[0, -0.12, 0]} castShadow>
        <boxGeometry args={[8.6, 0.22, 8.6]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.8} metalness={0.05} />
      </mesh>

      <mesh position={[0, -0.005, 0]}>
        <boxGeometry args={[8.4, 0.03, 8.4]} />
        <meshStandardMaterial
          color="#c89a30"
          roughness={0.3}
          metalness={0.8}
          emissive="#c89a30"
          emissiveIntensity={0.15}
        />
      </mesh>

      {squares.map(({ square, isLight, x, z }) => (
        <MarbleSquare
          key={square}
          square={square as any}
          isLight={isLight}
          position={[x, 0, z]}
          isSelected={selectedSquare === square}
          isLegalMove={legalMoves.includes(square as any)}
          isLastMove={lastMove?.from === square || lastMove?.to === square}
          isInCheck={isInCheck}
        />
      ))}
    </group>
  )
}
