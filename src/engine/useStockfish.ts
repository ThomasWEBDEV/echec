// ============================================================
// useStockfish — hook React qui pilote le worker Stockfish
// ============================================================

import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { DIFFICULTY_MAP } from '@/types'
import type { Square, PieceSymbol } from 'chess.js'

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null)

  const {
    fen,
    isAiThinking,
    playerColor,
    difficulty,
    phase,
    applyAiMove,
  } = useGameStore()

  // Initialiser le worker au montage
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./stockfish.worker.ts', import.meta.url),
      { type: 'module' },
    )

    workerRef.current.postMessage({ type: 'init' })

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data
      if (type === 'bestmove') {
        applyAiMove(
          payload.from as Square,
          payload.to as Square,
          payload.promotion as PieceSymbol | undefined,
        )
      }
    }

    return () => {
      workerRef.current?.postMessage({ type: 'quit' })
      workerRef.current?.terminate()
    }
  }, [])

  // Déclencher la réflexion de l'IA quand c'est son tour
  useEffect(() => {
    if (!isAiThinking || phase !== 'playing') return

    const aiColor = playerColor === 'white' ? 'black' : 'white'
    const currentTurn = fen.split(' ')[1] === 'w' ? 'white' : 'black'
    if (currentTurn !== aiColor) return

    const config = DIFFICULTY_MAP[difficulty]

    workerRef.current?.postMessage({
      type: 'move',
      payload: {
        fen,
        depth: config.depth,
        thinkTimeMs: config.thinkTimeMs,
      },
    })
  }, [isAiThinking, fen])

  const stopThinking = useCallback(() => {
    workerRef.current?.postMessage({ type: 'stop' })
  }, [])

  return { stopThinking }
}
