import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { Chess } from 'chess.js'
import type { Square, PieceSymbol, Color } from 'chess.js'
import type { Difficulty, PlayerColor, GamePhase, MoveRecord, GameEndState } from '@/types'
import { DIFFICULTY_MAP } from '@/types'

const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
}

function computeMaterialScore(captured: PieceSymbol[]): number {
  return captured.reduce((sum, p) => sum + PIECE_VALUE[p], 0)
}

function detectGameOverReason(chess: Chess): { result: string; reason: string } | null {
  if (!chess.isGameOver()) return null
  if (chess.isCheckmate()) return { result: 'checkmate', reason: 'Échec et mat' }
  if (chess.isStalemate()) return { result: 'draw', reason: 'Pat' }
  if (chess.isInsufficientMaterial()) return { result: 'draw', reason: 'Matériel insuffisant' }
  if (chess.isThreefoldRepetition()) return { result: 'draw', reason: 'Répétition triple' }
  if (chess.isDraw()) return { result: 'draw', reason: 'Règle des 50 coups' }
  return null
}

export type AnimationEvent =
  | { type: 'move'; from: Square; to: Square }
  | { type: 'capture'; from: Square; to: Square; piece: PieceSymbol }
  | { type: 'castle'; side: 'kingside' | 'queenside'; color: Color }
  | { type: 'promotion'; from: Square; square: Square; piece: PieceSymbol }
  | { type: 'check'; kingSquare: Square }
  | { type: 'checkmate'; kingSquare: Square }
  | { type: 'en-passant'; from: Square; to: Square; capturedSquare: Square }
  | { type: 'undo'; fen: string }

export interface GameStore {
  difficulty: Difficulty
  playerColor: PlayerColor
  phase: GamePhase
  fen: string
  selectedSquare: Square | null
  legalMoves: Square[]
  lastMove: { from: Square; to: Square } | null
  moveHistory: MoveRecord[]
  fenHistory: string[]
  capturedByWhite: PieceSymbol[]
  capturedByBlack: PieceSymbol[]
  materialScoreWhite: number
  materialScoreBlack: number
  isAiThinking: boolean
  isInCheck: boolean
  checkedKingSquare: Square | null
  endState: GameEndState | null
  isFlipped: boolean
  pendingPromotion: { from: Square; to: Square } | null
  clockWhite: number
  clockBlack: number
  clockActive: boolean
  lastAnimationEvent: AnimationEvent | null
  premove: { from: Square; to: Square } | null
  setDifficulty: (d: Difficulty) => void
  setPlayerColor: (c: PlayerColor) => void
  startGame: () => void
  selectSquare: (sq: Square) => void
  confirmPromotion: (piece: PieceSymbol) => void
  cancelPromotion: () => void
  applyAiMove: (from: Square, to: Square, promotion?: PieceSymbol) => void
  undoMove: () => void
  flipBoard: () => void
  resign: () => void
  resetToMenu: () => void
  tickClock: () => void
  clearAnimationEvent: () => void
  cancelPremove: () => void
  onAnimationComplete: () => void
  _executeMove: (from: Square, to: Square, promotion?: PieceSymbol, isAi?: boolean) => void
}

let chess = new Chess()

export const useGameStore = create<GameStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      difficulty: 2,
      playerColor: 'white',
      phase: 'menu',
      fen: chess.fen(),
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      moveHistory: [],
      fenHistory: [chess.fen()],
      capturedByWhite: [],
      capturedByBlack: [],
      materialScoreWhite: 0,
      materialScoreBlack: 0,
      isAiThinking: false,
      isInCheck: false,
      checkedKingSquare: null,
      endState: null,
      isFlipped: false,
      pendingPromotion: null,
      clockWhite: 600,
      clockBlack: 600,
      clockActive: false,
      lastAnimationEvent: null,
      premove: null,

      setDifficulty: (difficulty) => set({ difficulty }),
      setPlayerColor: (playerColor) => set({ playerColor }),

      startGame: () => {
        chess = new Chess()
        const config = DIFFICULTY_MAP[get().difficulty]
        const playerColor = get().playerColor
        set({
          phase: 'playing',
          fen: chess.fen(),
          selectedSquare: null,
          legalMoves: [],
          lastMove: null,
          moveHistory: [],
          fenHistory: [chess.fen()],
          capturedByWhite: [],
          capturedByBlack: [],
          materialScoreWhite: 0,
          materialScoreBlack: 0,
          // Si le joueur est noir, l'IA (blanc) doit jouer en premier
          isAiThinking: playerColor === 'black',
          isInCheck: false,
          checkedKingSquare: null,
          endState: null,
          clockWhite: config.thinkTimeMs * 10,
          clockBlack: config.thinkTimeMs * 10,
          clockActive: true,
          lastAnimationEvent: null,
          premove: null,
        })
      },

      selectSquare: (sq: Square) => {
        const { selectedSquare, playerColor, isAiThinking, pendingPromotion } = get()
        if (pendingPromotion) return
        const currentTurn = chess.turn() === 'w' ? 'white' : 'black'
        const piece = chess.get(sq)

        if (isAiThinking) {
          if (selectedSquare && piece?.color !== (playerColor === 'white' ? 'w' : 'b')) {
            set({ premove: { from: selectedSquare, to: sq }, selectedSquare: null, legalMoves: [] })
          } else if (piece?.color === (playerColor === 'white' ? 'w' : 'b')) {
            const moves = chess.moves({ square: sq, verbose: true }).map((m) => m.to as Square)
            set({ selectedSquare: sq, legalMoves: moves, premove: null })
          }
          return
        }

        if (currentTurn !== playerColor) return

        if (!selectedSquare) {
          if (!piece) return
          if ((piece.color === 'w' ? 'white' : 'black') !== playerColor) return
          const moves = chess.moves({ square: sq, verbose: true }).map((m) => m.to as Square)
          set({ selectedSquare: sq, legalMoves: moves })
          return
        }

        const legalMove = chess
          .moves({ square: selectedSquare, verbose: true })
          .find((m) => m.to === sq)

        if (legalMove) {
          get()._executeMove(selectedSquare, sq, legalMove.flags.includes('p') ? 'q' : undefined)
          return
        }

        if (piece && (piece.color === 'w' ? 'white' : 'black') === playerColor) {
          const moves = chess.moves({ square: sq, verbose: true }).map((m) => m.to as Square)
          set({ selectedSquare: sq, legalMoves: moves })
          return
        }

        set({ selectedSquare: null, legalMoves: [] })
      },

      confirmPromotion: (piece: PieceSymbol) => {
        const { pendingPromotion } = get()
        if (!pendingPromotion) return
        get()._executeMove(pendingPromotion.from, pendingPromotion.to, piece)
        set({ pendingPromotion: null })
      },

      cancelPromotion: () => {
        set({ pendingPromotion: null, selectedSquare: null, legalMoves: [] })
      },

      applyAiMove: (from: Square, to: Square, promotion: PieceSymbol = 'q') => {
        const { premove } = get()
        get()._executeMove(from, to, promotion, true)
        if (premove) {
          const valid = chess
            .moves({ square: premove.from, verbose: true })
            .find((m) => m.to === premove.to)
          if (valid) get()._executeMove(premove.from, premove.to)
          set({ premove: null })
        }
      },

      cancelPremove: () => set({ premove: null }),

      undoMove: () => {
        chess.undo()
        chess.undo()
        const history = [...get().moveHistory]
        history.pop()
        history.pop()
        const fenHistory = [...get().fenHistory]
        fenHistory.pop()
        fenHistory.pop()
        const newFen = chess.fen()
        set({
          fen: newFen,
          selectedSquare: null,
          legalMoves: [],
          lastMove: history.length > 0 ? { from: history[history.length - 1].from, to: history[history.length - 1].to } : null,
          moveHistory: history,
          fenHistory,
          isAiThinking: false,
          isInCheck: chess.inCheck(),
          checkedKingSquare: null,
          lastAnimationEvent: { type: 'undo', fen: newFen },
        })
      },

      flipBoard: () => set((s) => ({ isFlipped: !s.isFlipped })),

      resign: () => set({
        phase: 'end',
        endState: { result: 'resign', reason: 'Abandon' },
        isAiThinking: false,
        clockActive: false,
      }),

      resetToMenu: () => {
        chess = new Chess()
        set({
          phase: 'menu',
          fen: chess.fen(),
          selectedSquare: null,
          legalMoves: [],
          lastMove: null,
          moveHistory: [],
          fenHistory: [chess.fen()],
          capturedByWhite: [],
          capturedByBlack: [],
          materialScoreWhite: 0,
          materialScoreBlack: 0,
          isAiThinking: false,
          isInCheck: false,
          checkedKingSquare: null,
          endState: null,
          clockActive: false,
          lastAnimationEvent: null,
          premove: null,
          pendingPromotion: null,
        })
      },

      tickClock: () => {
        const { clockActive, phase, playerColor } = get()
        if (!clockActive || phase !== 'playing') return
        const isPlayerTurn = chess.turn() === (playerColor === 'white' ? 'w' : 'b')
        const key = isPlayerTurn ? 'clockWhite' : 'clockBlack'
        const current = get()[key]
        if (current <= 0) {
          set({
            phase: 'end',
            endState: { result: isPlayerTurn ? 'loss' : 'win', reason: 'Temps écoulé' },
            clockActive: false,
          })
          return
        }
        set({ [key]: current - 1 } as Partial<GameStore>)
      },

      clearAnimationEvent: () => set({ lastAnimationEvent: null }),

      onAnimationComplete: () => set({ isAiThinking: false }),

      _executeMove: (from: Square, to: Square, promotion: PieceSymbol = 'q', isAi = false) => {
        const result = chess.move({ from, to, promotion })
        if (!result) return

        let animEvent: AnimationEvent

        if (result.flags.includes('k') || result.flags.includes('q')) {
          animEvent = {
            type: 'castle',
            side: result.flags.includes('k') ? 'kingside' : 'queenside',
            color: result.color,
          }
        } else if (result.flags.includes('e')) {
          const capturedRank = result.color === 'w' ? '5' : '4'
          animEvent = {
            type: 'en-passant',
            from: result.from as Square,
            to: result.to as Square,
            capturedSquare: `${result.to[0]}${capturedRank}` as Square,
          }
        } else if (result.flags.includes('p')) {
          animEvent = {
            type: 'promotion',
            from: result.from as Square,
            square: result.to as Square,
            piece: result.promotion as PieceSymbol,
          }
        } else if (result.captured) {
          animEvent = {
            type: 'capture',
            from: result.from as Square,
            to: result.to as Square,
            piece: result.captured as PieceSymbol,
          }
        } else {
          animEvent = { type: 'move', from: result.from as Square, to: result.to as Square }
        }

        let checkedKingSquare: Square | null = null
        if (chess.inCheck()) {
          const turn = chess.turn()
          const kingPiece = chess.board().flat().find((p) => p?.type === 'k' && p.color === turn)
          if (kingPiece) checkedKingSquare = kingPiece.square as Square
        }

        const capturedByWhite = [...get().capturedByWhite]
        const capturedByBlack = [...get().capturedByBlack]
        if (result.captured) {
          if (result.color === 'w') capturedByWhite.push(result.captured as PieceSymbol)
          else capturedByBlack.push(result.captured as PieceSymbol)
        }

        const newRecord: MoveRecord = {
          san: result.san,
          from: result.from as Square,
          to: result.to as Square,
          captured: result.captured as PieceSymbol | undefined,
          promotion: result.promotion as PieceSymbol | undefined,
          moveNumber: Math.ceil(chess.history().length / 2),
          color: result.color,
        }

        set({
          fen: chess.fen(),
          selectedSquare: null,
          legalMoves: [],
          lastMove: { from: result.from as Square, to: result.to as Square },
          moveHistory: [...get().moveHistory, newRecord],
          fenHistory: [...get().fenHistory, chess.fen()],
          capturedByWhite,
          capturedByBlack,
          materialScoreWhite: computeMaterialScore(capturedByWhite),
          materialScoreBlack: computeMaterialScore(capturedByBlack),
          isAiThinking: isAi ? get().isAiThinking : true,
          isInCheck: chess.inCheck(),
          checkedKingSquare,
          lastAnimationEvent: animEvent,
        })

        const gameOver = detectGameOverReason(chess)
        if (gameOver) {
          const { playerColor } = get()
          let finalResult = gameOver.result
          if (gameOver.result === 'checkmate') {
            const winner = chess.turn() === 'w' ? 'black' : 'white'
            finalResult = winner === playerColor ? 'win' : 'loss'
          }
          set({
            phase: 'end',
            endState: { result: finalResult as GameEndState['result'], reason: gameOver.reason },
            isAiThinking: false,
            clockActive: false,
          })
        }
      },
    })),
    { name: 'EchecStore' },
  ),
)
