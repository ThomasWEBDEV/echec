// ============================================================
// GameOver — modal de fin de partie
// ============================================================

import { useGameStore } from '@/store/useGameStore'

export function GameOver() {
  const { phase, endState, resetToMenu, startGame } = useGameStore()

  if (phase !== 'end' || !endState) return null

  const isWin = endState.result === 'win'
  const isDraw = endState.result === 'draw'
  const isLoss = endState.result === 'loss' || endState.result === 'resign'

  const icon = isWin ? '♔' : isDraw ? '♞' : '♚'
  const title = isWin ? 'Victoire' : isDraw ? 'Nulle' : 'Défaite'
  const color = isWin ? '#f0c060' : isDraw ? '#b8b0a0' : '#c0283c'

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(4,6,12,0.85)',
        backdropFilter: 'blur(16px)',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '48px 64px',
        background: 'rgba(14,18,32,0.95)',
        border: `1px solid ${color}40`,
        borderRadius: '20px',
        boxShadow: `0 0 60px ${color}20`,
        textAlign: 'center',
      }}>
        {/* Icône */}
        <div style={{
          fontSize: '4rem',
          lineHeight: 1,
          color,
          textShadow: `0 0 30px ${color}80`,
          animation: 'fadeIn 0.5s ease',
        }}>
          {icon}
        </div>

        {/* Titre */}
        <h2 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '2.5rem',
          fontWeight: 700,
          color,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          margin: 0,
          textShadow: `0 0 20px ${color}40`,
        }}>
          {title}
        </h2>

        {/* Raison */}
        <p style={{
          fontFamily: 'Geist Mono, monospace',
          fontSize: '0.75rem',
          color: '#b8b0a0',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          {endState.reason}
        </p>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={startGame}
            style={{
              padding: '12px 32px',
              background: `linear-gradient(135deg, #c89a30, #f0c060)`,
              border: 'none',
              borderRadius: '8px',
              color: '#04060c',
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(200,154,48,0.35)',
            }}
          >
            Rejouer
          </button>
          <button
            onClick={resetToMenu}
            style={{
              padding: '12px 32px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#b8b0a0',
              fontFamily: 'Geist Mono, monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Menu
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
