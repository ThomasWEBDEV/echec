// ============================================================
// useAI — moteur IA simple en JavaScript pur
// Stockfish sera branché en Phase 2
// Évalue les coups par valeur matérielle + position
// ============================================================

import { useEffect } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { Chess } from 'chess.js'
import type { Square, PieceSymbol } from 'chess.js'
import { DIFFICULTY_MAP } from '@/types'

// Valeur des pièces
const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
}

// Bonus de position pour les pièces blanches (miroir pour noires)
const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
]

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
]

function squareIndex(square: string, color: 'w' | 'b'): number {
  const file = square.charCodeAt(0) - 97
  const rank = parseInt(square[1]) - 1
  const idx = color === 'w' ? (7 - rank) * 8 + file : rank * 8 + file
  return idx
}

function evaluate(chess: Chess): number {
  let score = 0
  chess.board().flat().forEach((piece) => {
    if (!piece) return
    const val = PIECE_VALUE[piece.type]
    const idx = squareIndex(piece.square, piece.color)
    const posBonus = piece.type === 'p'
      ? PAWN_TABLE[idx]
      : piece.type === 'n'
        ? KNIGHT_TABLE[idx]
        : 0
    if (piece.color === 'w') score += val + posBonus
    else score -= val + posBonus
  })
  return score
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, isMax: boolean): number {
  if (depth === 0 || chess.isGameOver()) return evaluate(chess)

  const moves = chess.moves({ verbose: true })

  if (isMax) {
    let best = -Infinity
    for (const move of moves) {
      chess.move(move)
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false))
      chess.undo()
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const move of moves) {
      chess.move(move)
      best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true))
      chess.undo()
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

function getBestMove(fen: string, depth: number) {
  const chess = new Chess(fen)
  const moves = chess.moves({ verbose: true })
  if (moves.length === 0) return null

  // Mélanger pour éviter les répétitions
  moves.sort(() => Math.random() - 0.5)

  let bestMove = moves[0]
  let bestScore = Infinity

  for (const move of moves) {
    chess.move(move)
    const score = minimax(chess, depth - 1, -Infinity, Infinity, true)
    chess.undo()
    if (score < bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

export function useStockfish() {
  const { fen, isAiThinking, playerColor, difficulty, phase, applyAiMove } = useGameStore()

  useEffect(() => {
    if (!isAiThinking || phase !== 'playing') return

    const aiColor = playerColor === 'white' ? 'black' : 'white'
    const currentTurn = fen.split(' ')[1] === 'w' ? 'white' : 'black'
    if (currentTurn !== aiColor) return

    const config = DIFFICULTY_MAP[difficulty]
    // Depth réduit pour la performance en JS pur
    const depth = Math.min(config.depth, difficulty === 1 ? 2 : difficulty === 2 ? 3 : 4)

    const timeout = setTimeout(() => {
      const best = getBestMove(fen, depth)
      if (best) {
        applyAiMove(
          best.from as Square,
          best.to as Square,
          best.promotion as PieceSymbol | undefined,
        )
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [isAiThinking, fen])
}
