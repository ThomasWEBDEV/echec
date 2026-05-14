import type { Color, PieceSymbol, Square } from 'chess.js'

export type Difficulty = 1 | 2 | 3
export type PlayerColor = 'white' | 'black'
export type GamePhase = 'menu' | 'playing' | 'end'

export interface DifficultyConfig {
  label: string
  sublabel: string
  depth: number
  thinkTimeMs: number
}

export const DIFFICULTY_MAP: Record<Difficulty, DifficultyConfig> = {
  1: { label: 'Initié',       sublabel: 'ELO ~800',  depth: 5,  thinkTimeMs: 400  },
  2: { label: 'Maître',       sublabel: 'ELO ~1800', depth: 12, thinkTimeMs: 1200 },
  3: { label: 'Grand Maître', sublabel: 'ELO ~2800', depth: 20, thinkTimeMs: 3000 },
}

export interface MoveRecord {
  san: string
  from: Square
  to: Square
  captured?: PieceSymbol
  promotion?: PieceSymbol
  moveNumber: number
  color: Color
}

export interface GameEndState {
  result: 'win' | 'loss' | 'draw' | 'resign' | 'checkmate'
  reason: string
}
