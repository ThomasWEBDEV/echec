// ============================================================
// GameOver — panneau flottant de fin de partie
// ============================================================

import { useState } from 'react'
import { Chess } from 'chess.js'
import { useGameStore } from '@/store/useGameStore'

// ── Mini plateau 2D ───────────────────────────────────────────────────────────

const PIECE_UNICODE: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
}

// Couleurs cases : claires ivoire chaud, sombres brun-vert foncé
const SQ_LIGHT = '#f0d9b5'
const SQ_DARK  = '#4a7c59'
const SQ_LIGHT_HL = '#f6f669'
const SQ_DARK_HL  = '#baca2b'

// Couleurs pièces : blanc = crème avec ombre noire, noir = anthracite avec ombre dorée
const PIECE_COLOR: Record<string, string> = {
  w: '#fffdf0',
  b: '#1a1a1a',
}
const PIECE_SHADOW: Record<string, string> = {
  w: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.5)',
  b: '0 1px 2px rgba(255,220,100,0.4), 0 0 4px rgba(0,0,0,0.8)',
}

function MiniBoard({ fen, lastFrom, lastTo }: { fen: string; lastFrom?: string; lastTo?: string }) {
  const chess = new Chess(fen)
  const board = chess.board()
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const SIZE = 37

  return (
    <div style={{
      display: 'inline-block',
      border: '2px solid rgba(255,255,255,0.12)',
      borderRadius: '6px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    }}>
      {board.map((rank, ri) => (
        <div key={ri} style={{ display: 'flex' }}>
          {rank.map((cell, fi) => {
            const sq = files[fi] + (8 - ri)
            const isLight = (ri + fi) % 2 === 0
            const isHighlight = sq === lastFrom || sq === lastTo
            const bg = isHighlight
              ? (isLight ? SQ_LIGHT_HL : SQ_DARK_HL)
              : (isLight ? SQ_LIGHT : SQ_DARK)
            return (
              <div key={fi} style={{
                width: SIZE, height: SIZE,
                background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', lineHeight: 1, userSelect: 'none',
                color: cell ? PIECE_COLOR[cell.color] : 'transparent',
                textShadow: cell ? PIECE_SHADOW[cell.color] : 'none',
              }}>
                {cell ? PIECE_UNICODE[cell.color + cell.type] ?? '' : ''}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function GameOver() {
  const { phase, endState, resetToMenu, startGame, fenHistory, moveHistory } = useGameStore()
  const [reviewing, setReviewing] = useState(false)
  const [reviewIdx, setReviewIdx] = useState(0)

  if (phase !== 'end' || !endState) return null

  const isWin = endState.result === 'win'
  const isDraw = endState.result === 'draw'

  const icon = isWin ? '♔' : isDraw ? '♞' : '♚'
  const title = isWin ? 'Victoire' : isDraw ? 'Nulle' : 'Défaite'
  const color = isWin ? '#f0c060' : isDraw ? '#b8b0a0' : '#c0283c'

  const totalFens = fenHistory.length
  const currentFen = fenHistory[reviewIdx] ?? fenHistory[totalFens - 1]
  const currentMove = reviewIdx > 0 ? moveHistory[reviewIdx - 1] : null

  function openReview() {
    setReviewIdx(totalFens - 1)
    setReviewing(true)
  }

  function prev() { setReviewIdx((i) => Math.max(0, i - 1)) }
  function next() { setReviewIdx((i) => Math.min(totalFens - 1, i + 1)) }

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      width: '100%',
      maxWidth: 600,
      pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: reviewing ? '12px' : '10px',
        padding: reviewing ? '16px' : '14px 24px',
        background: 'rgba(10,14,26,0.92)',
        border: `1px solid ${color}50`,
        borderRadius: '14px',
        boxShadow: `0 4px 32px rgba(0,0,0,0.6), 0 0 20px ${color}15`,
        backdropFilter: 'blur(8px)',
        animation: 'slideDown 0.35s cubic-bezier(0.22,1,0.36,1)',
      }}>

        {/* Ligne résumé */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.6rem', color, lineHeight: 1 }}>{icon}</span>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.5rem',
            fontWeight: 700,
            color,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            margin: 0,
          }}>{title}</h2>
          <span style={{
            fontFamily: 'Geist Mono, monospace',
            fontSize: '0.65rem',
            color: '#7a7068',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>{endState.reason}</span>
        </div>

        {/* Boutons principaux */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={startGame} style={btnStyle('#c89a30', '#f0c060', '#04060c', true)}>Rejouer</button>
          <button onClick={() => { setReviewing(false); resetToMenu() }} style={btnStyle('transparent', 'transparent', '#b8b0a0', false)}>
            Menu
          </button>
          <button onClick={reviewing ? () => setReviewing(false) : openReview} style={btnStyle('transparent', 'transparent', color, false)}>
            {reviewing ? 'Fermer' : 'Revoir'}
          </button>
        </div>

        {/* Mode révision */}
        {reviewing && (
          <>
            {/* Navigation coups */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'center' }}>
              <NavBtn onClick={() => setReviewIdx(0)} disabled={reviewIdx === 0} label="⏮" />
              <NavBtn onClick={prev} disabled={reviewIdx === 0} label="◀" />
              <span style={{
                fontFamily: 'Geist Mono, monospace',
                fontSize: '0.85rem',
                color: '#d8d0c0',
                minWidth: 130,
                textAlign: 'center',
              }}>
                {reviewIdx === 0
                  ? 'Position initiale'
                  : currentMove
                    ? `${currentMove.moveNumber}${currentMove.color === 'w' ? '.' : '…'} ${currentMove.san}`
                    : `Coup ${reviewIdx}`}
              </span>
              <NavBtn onClick={next} disabled={reviewIdx === totalFens - 1} label="▶" />
              <NavBtn onClick={() => setReviewIdx(totalFens - 1)} disabled={reviewIdx === totalFens - 1} label="⏭" />
            </div>

            {/* Mini plateau */}
            <MiniBoard
              fen={currentFen}
              lastFrom={currentMove?.from}
              lastTo={currentMove?.to}
            />

            {/* Liste coups */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: '3px 6px',
              maxHeight: 100,
              overflowY: 'auto',
              width: '100%',
              padding: '4px 2px',
            }}>
              {moveHistory.map((m, i) => (
                <span
                  key={i}
                  onClick={() => setReviewIdx(i + 1)}
                  style={{
                    fontFamily: 'Geist Mono, monospace',
                    fontSize: '0.8rem',
                    color: reviewIdx === i + 1 ? color : '#9a9088',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    background: reviewIdx === i + 1 ? `${color}20` : 'rgba(255,255,255,0.03)',
                    border: reviewIdx === i + 1 ? `1px solid ${color}50` : '1px solid transparent',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {m.color === 'w'
                    ? <span style={{ color: '#555', marginRight: 3 }}>{m.moveNumber}.</span>
                    : <span style={{ color: '#555', marginRight: 3 }}>{m.moveNumber}…</span>
                  }
                  {m.san}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function btnStyle(bg1: string, bg2: string, textColor: string, primary: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    background: primary ? `linear-gradient(135deg, ${bg1}, ${bg2})` : 'rgba(255,255,255,0.05)',
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.10)',
    borderRadius: '6px',
    color: textColor,
    fontFamily: primary ? 'Cormorant Garamond, serif' : 'Geist Mono, monospace',
    fontSize: primary ? '0.9rem' : '0.65rem',
    fontWeight: primary ? 700 : 400,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    boxShadow: primary ? '0 4px 16px rgba(200,154,48,0.3)' : 'none',
  }
}

function NavBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 8px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '4px',
        color: disabled ? '#3a3830' : '#b8b0a0',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
      }}
    >{label}</button>
  )
}
