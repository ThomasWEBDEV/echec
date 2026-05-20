import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { Chess } from 'chess.js'
import type { Square, PieceSymbol } from 'chess.js'

const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
}

const POSITION_BONUS: Partial<Record<PieceSymbol, number[]>> = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
}

function getIdx(square: string, color: 'w' | 'b'): number {
  const file = square.charCodeAt(0) - 97
  const rank = parseInt(square[1]) - 1
  return color === 'w' ? (7 - rank) * 8 + file : rank * 8 + file
}

function evaluate(chess: Chess, usePositionBonus: boolean): number {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -99999 : 99999
  if (chess.isDraw()) return 0
  let score = 0
  chess.board().flat().forEach((p) => {
    if (!p) return
    const val = PIECE_VALUE[p.type as PieceSymbol]
    const bonus = usePositionBonus && POSITION_BONUS[p.type as PieceSymbol]
      ? POSITION_BONUS[p.type as PieceSymbol]![getIdx(p.square, p.color)]
      : 0
    score += p.color === 'w' ? val + bonus : -(val + bonus)
  })
  return score
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMax: boolean,
  usePositionBonus: boolean,
): number {
  if (depth === 0 || chess.isGameOver()) return evaluate(chess, usePositionBonus)
  const moves = chess.moves({ verbose: true })
  // Captures en premier pour meilleur élagage
  moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0))

  if (isMax) {
    let best = -Infinity
    for (const m of moves) {
      chess.move(m)
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false, usePositionBonus))
      chess.undo()
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      chess.move(m)
      best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true, usePositionBonus))
      chess.undo()
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

function getBestMove(fen: string, depth: number, usePositionBonus: boolean) {
  const chess = new Chess(fen)
  const moves = chess.moves({ verbose: true })
  if (moves.length === 0) return null

  moves.sort(() => Math.random() - 0.5)
  moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0))

  const isBlack = chess.turn() === 'b'
  let bestMove = moves[0]
  let bestScore = isBlack ? Infinity : -Infinity
  const start = Date.now()

  for (const move of moves) {
    if (Date.now() - start > 1500) break
    chess.move(move)
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !isBlack, usePositionBonus)
    chess.undo()
    if (isBlack ? score < bestScore : score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

export function useStockfish() {
  const { fen, isAiThinking, playerColor, difficulty, phase, applyAiMove } = useGameStore()
  const thinkingRef = useRef(false)

  useEffect(() => {
    if (!isAiThinking || phase !== 'playing') return
    if (thinkingRef.current) return

    const aiColor = playerColor === 'white' ? 'black' : 'white'
    const currentTurn = fen.split(' ')[1] === 'w' ? 'white' : 'black'
    if (currentTurn !== aiColor) return

    thinkingRef.current = true

    // Niveau 1 : random, Niveau 2 : depth 2, Niveau 3 : depth 2 + bonus position
    const depth = difficulty === 1 ? 1 : 2
    const usePositionBonus = difficulty === 3

    const timeout = setTimeout(() => {
      requestAnimationFrame(() => {
        try {
          const best = getBestMove(fen, depth, usePositionBonus)
          if (best) {
            applyAiMove(
              best.from as Square,
              best.to as Square,
              best.promotion as PieceSymbol | undefined,
            )
          }
        } catch {
          const chess = new Chess(fen)
          const moves = chess.moves({ verbose: true })
          if (moves.length > 0) {
            const m = moves[Math.floor(Math.random() * moves.length)]
            applyAiMove(m.from as Square, m.to as Square)
          }
        } finally {
          thinkingRef.current = false
        }
      })
    }, 100)

    return () => {
      clearTimeout(timeout)
      thinkingRef.current = false
    }
  }, [isAiThinking, fen])
}
