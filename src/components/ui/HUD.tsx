import { useGameStore } from '@/store/useGameStore'
import { useEffect, useRef } from 'react'
import type { PieceSymbol } from 'chess.js'

const PIECE_SYMBOLS: Record<PieceSymbol, string> = {
  k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙',
}

function Clock({ seconds, active }: { seconds: number; active: boolean }) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  const isLow = seconds < 30
  return (
    <div style={{
      fontFamily: 'Geist Mono, monospace',
      fontSize: '1.2rem',
      fontWeight: 500,
      color: isLow ? '#c0283c' : active ? '#f0c060' : '#b8b0a0',
      letterSpacing: '0.1em',
      textShadow: active ? '0 0 12px rgba(240,192,96,0.5)' : 'none',
    }}>
      {mins}:{secs}
    </div>
  )
}

function CapturedPieces({ pieces }: { pieces: PieceSymbol[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', minHeight: '20px' }}>
      {[...pieces].sort().map((p, i) => (
        <span key={i} style={{ fontSize: '0.85rem', opacity: 0.8 }}>
          {PIECE_SYMBOLS[p]}
        </span>
      ))}
    </div>
  )
}

function MoveHistory() {
  const { moveHistory } = useGameStore()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [moveHistory])

  const pairs: { num: number; white?: string; black?: string }[] = []
  moveHistory.forEach((move) => {
    if (move.color === 'w') {
      pairs.push({ num: move.moveNumber, white: move.san })
    } else {
      const last = pairs[pairs.length - 1]
      if (last && last.num === move.moveNumber) last.black = move.san
      else pairs.push({ num: move.moveNumber, black: move.san })
    }
  })

  return (
    <div ref={listRef} style={{ maxHeight: '160px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#8a6418 transparent' }}>
      {pairs.map(({ num, white, black }) => (
        <div key={num} style={{
          display: 'grid', gridTemplateColumns: '1.5rem 1fr 1fr',
          gap: '4px', padding: '2px 0',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          fontSize: '0.7rem', fontFamily: 'Geist Mono, monospace',
        }}>
          <span style={{ color: '#8a6418' }}>{num}.</span>
          <span style={{ color: '#e8e2d4' }}>{white ?? ''}</span>
          <span style={{ color: '#b8b0a0' }}>{black ?? ''}</span>
        </div>
      ))}
    </div>
  )
}

export function HUD() {
  const {
    phase, playerColor, difficulty, isAiThinking,
    clockWhite, clockBlack, capturedByWhite, capturedByBlack,
    materialScoreWhite, materialScoreBlack,
    tickClock, undoMove, flipBoard, resign,
  } = useGameStore()

  useEffect(() => {
    if (phase !== 'playing') return
    const interval = setInterval(tickClock, 1000)
    return () => clearInterval(interval)
  }, [phase])

  if (phase !== 'playing') return null

  const isWhiteTurn = playerColor === 'white'

  const panel: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px 14px',
    background: 'rgba(8,11,20,0.88)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(240,192,96,0.10)',
    borderRadius: '12px',
    width: '160px',
    color: '#e8e2d4',
  }

  const label: React.CSSProperties = {
    fontFamily: 'Geist Mono, monospace',
    fontSize: '0.55rem',
    letterSpacing: '0.3em',
    color: '#8a6418',
    textTransform: 'uppercase',
    marginBottom: '2px',
  }

  const btn: React.CSSProperties = {
    padding: '5px 10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
    color: '#b8b0a0',
    fontFamily: 'Geist Mono, monospace',
    fontSize: '0.6rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  }

  return (
    <>
      {/* Panel gauche */}
      <div style={{ ...panel, left: '16px' }}>
        <div>
          <div style={label}>Capturées (blanc)</div>
          <CapturedPieces pieces={capturedByWhite} />
          {materialScoreWhite > 0 && <div style={{ fontSize: '0.65rem', color: '#8a6418' }}>+{materialScoreWhite}</div>}
        </div>
        <div>
          <div style={label}>Historique</div>
          <MoveHistory />
        </div>
        <div>
          <div style={label}>Capturées (noir)</div>
          <CapturedPieces pieces={capturedByBlack} />
          {materialScoreBlack > 0 && <div style={{ fontSize: '0.65rem', color: '#8a6418' }}>+{materialScoreBlack}</div>}
        </div>
      </div>

      {/* Panel droit */}
      <div style={{ ...panel, right: '16px' }}>
        <div>
          <div style={label}>IA</div>
          <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.7rem', color: '#b8b0a0' }}>
            {['Initié', 'Maître', 'Grand Maître'][difficulty - 1]}
          </div>
          {isAiThinking && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              {[0,1,2].map((i) => (
                <div key={i} style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: '#f0c060',
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={label}>Noir</div>
          <Clock seconds={clockBlack} active={!isWhiteTurn && !isAiThinking} />
        </div>

        <div style={{
          padding: '8px', background: 'rgba(240,192,96,0.06)',
          border: '1px solid rgba(240,192,96,0.12)', borderRadius: '6px',
          textAlign: 'center', fontFamily: 'Cormorant Garamond, serif',
          fontSize: '0.8rem', color: '#f0c060', letterSpacing: '0.1em',
        }}>
          {isAiThinking ? 'IA réfléchit...' : `Tour des ${isWhiteTurn ? 'blancs' : 'noirs'}`}
        </div>

        <div>
          <div style={label}>Blanc</div>
          <Clock seconds={clockWhite} active={isWhiteTurn && !isAiThinking} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button style={btn} onClick={undoMove}>Annuler</button>
          <button style={btn} onClick={flipBoard}>Retourner</button>
          <button style={{ ...btn, borderColor: 'rgba(192,40,60,0.3)', color: '#ff6060' }} onClick={resign}>
            Abandonner
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </>
  )
}
