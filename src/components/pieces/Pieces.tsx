import { useMemo } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { Piece } from './Piece'
import { Chess } from 'chess.js'
import type { Square, PieceSymbol, Color } from 'chess.js'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const BOARD_OFFSET = -3.5

function squareToPosition(square: Square, isFlipped: boolean): [number, number, number] {
  const file = FILES.indexOf(square[0])
  const rank = parseInt(square[1]) - 1
  const col = isFlipped ? 7 - file : file
  const row = isFlipped ? rank : 7 - rank
  return [col + BOARD_OFFSET, 0.08, row + BOARD_OFFSET]
}

interface PieceData {
  square: Square
  type: PieceSymbol
  color: Color
  position: [number, number, number]
}

export function Pieces() {
  const { fen, isFlipped } = useGameStore()

  const pieces = useMemo(() => {
    const chess = new Chess(fen)
    const result: PieceData[] = []

    chess.board().forEach((row) => {
      row.forEach((cell) => {
        if (!cell) return
        result.push({
          square: cell.square as Square,
          type: cell.type as PieceSymbol,
          color: cell.color as Color,
          position: squareToPosition(cell.square as Square, isFlipped),
        })
      })
    })

    return result
  }, [fen, isFlipped])

  return (
    <group name="pieces">
      {pieces.map(({ square, type, color, position }) => (
        <Piece
          key={`${square}-${type}-${color}`}
          type={type}
          color={color}
          square={square}
          position={position}
        />
      ))}
    </group>
  )
}
