// ============================================================
// ChessModel — intègre le GLB chess_set avec la logique de jeu
// ============================================================

import { useGLTF } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Square } from 'chess.js'
import { useGameStore } from '@/store/useGameStore'

const MODEL_PATH = '/models/chess_set.glb'
const MODEL_SCALE = 5.19
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

const INITIAL_PLACEMENT: Record<string, string> = {
  'Piece_02':     'a1', 'Piece_03':     'b1', 'Piece_04':     'c1', 'Piece_05':    'd1',
  'Piece_06':     'e1', 'Piece_04.001': 'f1', 'Piece_03.001': 'g1', 'Piece_02.001':'h1',
  'Piece_01':     'a2', 'Piece_01.001': 'b2', 'Piece_01.002': 'c2', 'Piece_01.003':'d2',
  'Piece_01.004': 'e2', 'Piece_01.005': 'f2', 'Piece_01.006': 'g2', 'Piece_01.007':'h2',
  'Piece_02.003': 'a8', 'Piece_03.003': 'b8', 'Piece_04.003': 'c8', 'Piece_06.001':'d8',
  'Piece_05.001': 'e8', 'Piece_04.002': 'f8', 'Piece_03.002': 'g8', 'Piece_02.002':'h8',
  'Piece_01.015': 'a7', 'Piece_01.014': 'b7', 'Piece_01.013': 'c7', 'Piece_01.012':'d7',
  'Piece_01.011': 'e7', 'Piece_01.010': 'f7', 'Piece_01.009': 'g7', 'Piece_01.008':'h7',
}

type LocalGrid = {
  origin: THREE.Vector3
  fileStep: THREE.Vector3
  rankStep: THREE.Vector3
}

type WorldGrid = {
  origin: THREE.Vector3
  fileStepW: THREE.Vector3
  rankStepW: THREE.Vector3
  boardY: number
}

type AnimState = {
  cur: THREE.Vector3
  from: THREE.Vector3
  to: THREE.Vector3
  t: number
  active: boolean
  arcH: number
  dur: number
}

// ── Overlays ──────────────────────────────────────────────────────────────────

function SquareHighlight({ position, color, opacity, pulse }: {
  position: THREE.Vector3
  color: string
  opacity: number
  pulse?: boolean
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (!pulse || !matRef.current) return
    matRef.current.opacity = Math.sin(clock.getElapsedTime() * 4) * 0.15 + opacity
  })
  return (
    <mesh position={[position.x, position.y + 0.04, position.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.95, 0.95]} />
      <meshBasicMaterial ref={matRef} color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

function LegalDot({ position }: { position: THREE.Vector3 }) {
  return (
    <mesh position={[position.x, position.y + 0.04, position.z]}>
      <cylinderGeometry args={[0.15, 0.15, 0.02, 24]} />
      <meshBasicMaterial color="#80c060" transparent opacity={0.85} />
    </mesh>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function ChessScene() {
  const { scene, nodes } = useGLTF(MODEL_PATH) as any
  const {
    lastAnimationEvent, selectedSquare, phase, selectSquare,
    legalMoves, lastMove, isInCheck, checkedKingSquare,
  } = useGameStore()

  // Repère LOCAL (espace parent des nodes) — pour bouger les pièces
  const grid = useRef<LocalGrid | null>(null)
  // Repère MONDE — pour overlays et détection de clic
  const gridWorld = useRef<WorldGrid | null>(null)
  const worldGridComputed = useRef(false)
  const [gridReady, setGridReady] = useState(false)
  const squareWorldCache = useRef(new Map<string, THREE.Vector3>())

  const sqToNode = useRef(
    new Map<string, string>(Object.entries(INITIAL_PLACEMENT).map(([k, v]) => [v, k]))
  )
  const nodeToSq = useRef(
    new Map<string, string | null>(Object.entries(INITIAL_PLACEMENT))
  )
  const anims = useRef(new Map<string, AnimState>())

  // ── Initialisation locale + matériaux ───────────────────────────────────
  useEffect(() => {
    const ref_a1 = nodes['Piece_02']
    const ref_b1 = nodes['Piece_03']
    const ref_a2 = nodes['Piece_01.007']
    if (!ref_a1 || !ref_b1 || !ref_a2) return

    grid.current = {
      origin:   ref_a1.position.clone(),
      fileStep: new THREE.Vector3().subVectors(ref_b1.position, ref_a1.position),
      rankStep: new THREE.Vector3().subVectors(ref_a2.position, ref_a1.position),
    }

    Object.keys(INITIAL_PLACEMENT).forEach((nodeId) => {
      const node = nodes[nodeId]
      if (!node) return
      node.traverse((child: THREE.Object3D) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh || !mesh.material) return
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m: THREE.Material) => m.clone())
        } else {
          mesh.material = (mesh.material as THREE.Material).clone()
        }
      })
      const pos = node.position.clone()
      anims.current.set(nodeId, {
        cur: pos.clone(), from: pos.clone(), to: pos.clone(),
        t: 1, active: false, arcH: 0, dur: 0.5,
      })
    })
  }, [nodes])

  // ── Repère monde (calculé au 1er frame, matrices valides) ────────────────
  useFrame(() => {
    if (worldGridComputed.current || !grid.current) return
    const ref_a1 = nodes['Piece_02']
    const ref_b1 = nodes['Piece_03']
    const ref_a2 = nodes['Piece_01.007']
    if (!ref_a1 || !ref_b1 || !ref_a2) return

    const a1w = new THREE.Vector3()
    const b1w = new THREE.Vector3()
    const a2w = new THREE.Vector3()
    ref_a1.getWorldPosition(a1w)
    ref_b1.getWorldPosition(b1w)
    ref_a2.getWorldPosition(a2w)

    const fileStepW = b1w.clone().sub(a1w)
    const rankStepW = a2w.clone().sub(a1w)

    gridWorld.current = {
      origin: a1w.clone(),
      fileStepW,
      rankStepW,
      boardY: a1w.y,
    }

    // Précalcul des positions monde de chaque case
    const map = squareWorldCache.current
    for (let fi = 0; fi < 8; fi++) {
      for (let ri = 0; ri < 8; ri++) {
        const sq = `${FILES[fi]}${ri + 1}`
        const pos = a1w.clone()
          .addScaledVector(fileStepW, fi)
          .addScaledVector(rankStepW, ri)
        map.set(sq, pos)
      }
    }

    worldGridComputed.current = true
    setGridReady(true)
  })

  // ── Reset au démarrage d'une partie ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || !grid.current) return
    sqToNode.current = new Map(Object.entries(INITIAL_PLACEMENT).map(([k, v]) => [v, k]))
    nodeToSq.current = new Map(Object.entries(INITIAL_PLACEMENT))
    Object.entries(INITIAL_PLACEMENT).forEach(([nodeId, sq]) => {
      const node = nodes[nodeId]
      if (!node) return
      node.visible = true
      const pos = squareLocalPos(sq)
      node.position.copy(pos)
      const anim = anims.current.get(nodeId)
      if (anim) { anim.cur.copy(pos); anim.from.copy(pos); anim.to.copy(pos); anim.t = 1; anim.active = false }
    })
  }, [phase])

  // ── Position locale d'une case (pour déplacer les nodes) ────────────────
  const squareLocalPos = (sq: string): THREE.Vector3 => {
    if (!grid.current) return new THREE.Vector3()
    const fi = FILES.indexOf(sq[0])
    const ri = parseInt(sq[1]) - 1
    const { origin, fileStep, rankStep } = grid.current
    return new THREE.Vector3(
      origin.x + fi * fileStep.x + ri * rankStep.x,
      origin.y,
      origin.z + fi * fileStep.z + ri * rankStep.z,
    )
  }

  // ── Animation ────────────────────────────────────────────────────────────
  const startAnim = (nodeId: string, toSq: string) => {
    const anim = anims.current.get(nodeId)
    if (!anim) return
    const to = squareLocalPos(toSq)
    const dist = anim.cur.distanceTo(to)
    anim.from  = anim.cur.clone()
    anim.to    = to.clone()
    anim.arcH  = 14 + dist * 0.15
    anim.dur   = Math.min(0.3 + dist * 0.003, 0.65)
    anim.t     = 0
    anim.active = true
  }

  // ── Événements de jeu ────────────────────────────────────────────────────
  useEffect(() => {
    if (!lastAnimationEvent || !grid.current) return
    const ev = lastAnimationEvent

    const captureAt = (sq: string) => {
      const id = sqToNode.current.get(sq)
      if (!id) return
      nodeToSq.current.set(id, null)
      sqToNode.current.delete(sq)
      const node = nodes[id]
      if (node) node.visible = false
    }

    const moveNode = (from: string, to: string) => {
      const id = sqToNode.current.get(from)
      if (!id) return
      sqToNode.current.delete(from)
      sqToNode.current.set(to, id)
      nodeToSq.current.set(id, to)
      startAnim(id, to)
    }

    switch (ev.type) {
      case 'move':    moveNode(ev.from, ev.to); break
      case 'capture': captureAt(ev.to); moveNode(ev.from, ev.to); break
      case 'en-passant': captureAt(ev.capturedSquare); moveNode(ev.from, ev.to); break
      case 'castle': {
        const rank = ev.color === 'w' ? '1' : '8'
        moveNode(`e${rank}`, ev.side === 'kingside' ? `g${rank}` : `c${rank}`)
        moveNode(ev.side === 'kingside' ? `h${rank}` : `a${rank}`, ev.side === 'kingside' ? `f${rank}` : `d${rank}`)
        break
      }
      case 'promotion': moveNode(ev.from, ev.square); break
    }
  }, [lastAnimationEvent])

  // ── Boucle d'animation ────────────────────────────────────────────────────
  useFrame((_, dt) => {
    anims.current.forEach((anim, nodeId) => {
      if (!anim.active) return
      const node = nodes[nodeId]
      if (!node) return
      anim.t += dt / anim.dur
      if (anim.t >= 1) {
        anim.t = 1; anim.active = false; anim.cur.copy(anim.to)
      } else {
        const e = anim.t < 0.5 ? 4 * anim.t ** 3 : 1 - (-2 * anim.t + 2) ** 3 / 2
        anim.cur.lerpVectors(anim.from, anim.to, e)
        anim.cur.y = THREE.MathUtils.lerp(anim.from.y, anim.to.y, e) + Math.sin(e * Math.PI) * anim.arcH
      }
      node.position.copy(anim.cur)
    })
  })

  // ── Highlight pièce sélectionnée ─────────────────────────────────────────
  useEffect(() => {
    nodeToSq.current.forEach((sq, nodeId) => {
      const node = nodes[nodeId]
      if (!node) return
      const isSelected = sq !== null && sq === selectedSquare
      node.traverse((child: THREE.Object3D) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh || !mesh.material) return
        const mat = mesh.material as THREE.MeshStandardMaterial
        if (!mat.emissive) return
        mat.emissive.set(isSelected ? '#c89a30' : '#000000')
        mat.emissiveIntensity = isSelected ? 0.4 : 0
      })
    })
  }, [selectedSquare, nodes])

  // ── Résolution clic sur pièce ────────────────────────────────────────────
  const resolveClickedPiece = (obj: THREE.Object3D): Square | null => {
    let cur: THREE.Object3D | null = obj
    while (cur) {
      if (nodeToSq.current.has(cur.name)) {
        const sq = nodeToSq.current.get(cur.name)
        return sq != null ? (sq as Square) : null
      }
      cur = cur.parent
    }
    return null
  }

  // ── Résolution clic sur case vide (via position monde) ──────────────────
  const resolveClickedPos = (worldPoint: THREE.Vector3): Square | null => {
    if (!gridWorld.current) return null
    const { origin, fileStepW, rankStepW } = gridWorld.current
    const delta = worldPoint.clone().sub(origin)
    const fi = Math.round(delta.dot(fileStepW) / fileStepW.lengthSq())
    const ri = Math.round(delta.dot(rankStepW) / rankStepW.lengthSq())
    if (fi < 0 || fi > 7 || ri < 0 || ri > 7) return null
    return `${FILES[fi]}${ri + 1}` as Square
  }

  const cache = squareWorldCache.current

  return (
    <>
      <primitive
        object={scene}
        scale={MODEL_SCALE}
        rotation={[0, Math.PI, 0]}
        onClick={(e: any) => {
          e.stopPropagation()
          if (phase !== 'playing') return
          const sq = resolveClickedPiece(e.object) ?? resolveClickedPos(e.point)
          if (sq) selectSquare(sq)
        }}
        onPointerOver={(e: any) => {
          if (phase !== 'playing') return
          const sq = resolveClickedPiece(e.object) ?? resolveClickedPos(e.point)
          if (sq) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      />

      {gridReady && phase === 'playing' && (
        <group>
          {lastMove?.from && cache.get(lastMove.from) && (
            <SquareHighlight position={cache.get(lastMove.from)!} color="#d4a020" opacity={0.22} />
          )}
          {lastMove?.to && cache.get(lastMove.to) && (
            <SquareHighlight position={cache.get(lastMove.to)!} color="#d4a020" opacity={0.22} />
          )}
          {isInCheck && checkedKingSquare && cache.get(checkedKingSquare) && (
            <SquareHighlight position={cache.get(checkedKingSquare)!} color="#c0283c" opacity={0.5} pulse />
          )}
          {selectedSquare && cache.get(selectedSquare) && (
            <SquareHighlight position={cache.get(selectedSquare)!} color="#e8c840" opacity={0.45} pulse />
          )}
          {legalMoves.map((sq) => {
            const pos = cache.get(sq)
            return pos ? <LegalDot key={sq} position={pos} /> : null
          })}
        </group>
      )}
    </>
  )
}

useGLTF.preload(MODEL_PATH)
