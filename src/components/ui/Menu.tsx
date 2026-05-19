// ============================================================
// Menu — écran d'accueil cinématique
// Sélection difficulté, couleur, bouton démarrer
// ============================================================

import { useState } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { DIFFICULTY_MAP } from '@/types'
import type { Difficulty, PlayerColor } from '@/types'

export function Menu() {
  const { phase, setDifficulty, setPlayerColor, startGame, difficulty, playerColor } = useGameStore()
  const [hoveredDiff, setHoveredDiff] = useState<Difficulty | null>(null)
  const [hoveredColor, setHoveredColor] = useState<PlayerColor | null>(null)

  if (phase !== 'menu') return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      background: 'rgba(4, 6, 12, 0.92)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '48px',
        maxWidth: '560px',
        width: '100%',
        padding: '0 24px',
      }}>

        {/* Titre */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(4rem, 10vw, 7rem)',
            fontWeight: 700,
            color: '#f0c060',
            letterSpacing: '0.3em',
            lineHeight: 1,
            textShadow: '0 0 60px rgba(240,192,96,0.3), 0 0 120px rgba(240,192,96,0.1)',
            margin: 0,
          }}>
            ÉCHEC
          </h1>
          <p style={{
            fontFamily: 'Geist Mono, monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.5em',
            color: '#8a6418',
            marginTop: '12px',
            textTransform: 'uppercase',
          }}>
            Chess Reimagined
          </p>
        </div>

        {/* Sélection difficulté */}
        <div style={{ width: '100%' }}>
          <p style={{
            fontFamily: 'Geist Mono, monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.35em',
            color: '#8a6418',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            Difficulté
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            {([1, 2, 3] as Difficulty[]).map((level) => {
              const config = DIFFICULTY_MAP[level]
              const isActive = difficulty === level
              const isHovered = hoveredDiff === level
              return (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  onMouseEnter={() => setHoveredDiff(level)}
                  onMouseLeave={() => setHoveredDiff(null)}
                  style={{
                    flex: 1,
                    padding: '16px 12px',
                    background: isActive
                      ? 'rgba(240,192,96,0.10)'
                      : isHovered
                        ? 'rgba(240,192,96,0.05)'
                        : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? 'rgba(240,192,96,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 0 20px rgba(240,192,96,0.10)' : 'none',
                  }}
                >
                  <span style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: isActive ? '#f0c060' : '#e8e2d4',
                    letterSpacing: '0.05em',
                  }}>
                    {config.label}
                  </span>
                  <span style={{
                    fontFamily: 'Geist Mono, monospace',
                    fontSize: '0.6rem',
                    color: '#8a6418',
                    letterSpacing: '0.1em',
                  }}>
                    {config.sublabel}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sélection couleur */}
        <div style={{ width: '100%' }}>
          <p style={{
            fontFamily: 'Geist Mono, monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.35em',
            color: '#8a6418',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            Jouer avec
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            {(['white', 'black'] as PlayerColor[]).map((c) => {
              const isActive = playerColor === c
              const isHovered = hoveredColor === c
              return (
                <button
                  key={c}
                  onClick={() => setPlayerColor(c)}
                  onMouseEnter={() => setHoveredColor(c)}
                  onMouseLeave={() => setHoveredColor(null)}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: isActive
                      ? 'rgba(240,192,96,0.10)'
                      : isHovered
                        ? 'rgba(240,192,96,0.05)'
                        : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? 'rgba(240,192,96,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 0 20px rgba(240,192,96,0.10)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '2rem', lineHeight: 1 }}>
                    {c === 'white' ? '♔' : '♚'}
                  </span>
                  <span style={{
                    fontFamily: 'Geist Mono, monospace',
                    fontSize: '0.65rem',
                    letterSpacing: '0.2em',
                    color: isActive ? '#f0c060' : '#b8b0a0',
                    textTransform: 'uppercase',
                  }}>
                    {c === 'white' ? 'Blanc' : 'Noir'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Bouton démarrer */}
        <button
          onClick={startGame}
          style={{
            padding: '16px 64px',
            background: 'linear-gradient(135deg, #c89a30, #f0c060)',
            border: 'none',
            borderRadius: '8px',
            color: '#04060c',
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.1rem',
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(200,154,48,0.35)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 16px 40px rgba(200,154,48,0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(200,154,48,0.35)'
          }}
        >
          Commencer
        </button>
      </div>
    </div>
  )
}
