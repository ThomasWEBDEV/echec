// ============================================================
// ChessModel — GLB chess_set avec logique de jeu complète
// ============================================================

import { useGLTF } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { useGameStore } from '@/store/useGameStore'
import type { AnimationEvent } from '@/store/useGameStore'

const MODEL_PATH = '/models/chess_set.glb'
const MODEL_SCALE = 5.19
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

// Mapping vérifié par projection monde (console diagnostic 2026-05-25)
const INITIAL_PLACEMENT: Record<string, string> = {
  'Piece_02':    'a1', 'Piece_03':    'b1', 'Piece_04':    'c1', 'Piece_05':    'd1',
  'Piece_06':    'e1', 'Piece_04001': 'f1', 'Piece_03001': 'g1', 'Piece_02001': 'h1',
  'Piece_01':    'a2', 'Piece_01001': 'b2', 'Piece_01002': 'c2', 'Piece_01003': 'd2',
  'Piece_01004': 'e2', 'Piece_01005': 'f2', 'Piece_01006': 'g2', 'Piece_01007': 'h2',
  'Piece_02003': 'a8', 'Piece_03003': 'b8', 'Piece_04003': 'c8', 'Piece_05001': 'd8',
  'Piece_06001': 'e8', 'Piece_04002': 'f8', 'Piece_03002': 'g8', 'Piece_02002': 'h8',
  'Piece_01015': 'a7', 'Piece_01014': 'b7', 'Piece_01013': 'c7', 'Piece_01012': 'd7',
  'Piece_01011': 'e7', 'Piece_01010': 'f7', 'Piece_01009': 'g7', 'Piece_01008': 'h7',
}

// Dérive le type de pièce depuis le nom du node GLB
function getNodePieceType(nodeId: string): string {
  if (nodeId.startsWith('Piece_01')) return 'p'
  if (nodeId.startsWith('Piece_02')) return 'r'
  if (nodeId.startsWith('Piece_03')) return 'n'
  if (nodeId.startsWith('Piece_04')) return 'b'
  if (nodeId.startsWith('Piece_05')) return 'q'
  if (nodeId.startsWith('Piece_06')) return 'k'
  return 'p'
}

// Dérive la couleur depuis la case initiale (rang 1-2 = blanc, 7-8 = noir)
function getNodeColor(nodeId: string): 'w' | 'b' {
  const sq = INITIAL_PLACEMENT[nodeId]
  return (sq[1] === '1' || sq[1] === '2') ? 'w' : 'b'
}

type LocalGrid = {
  origin:   THREE.Vector3
  fileStep: THREE.Vector3
  rankStep: THREE.Vector3
}

type WorldGrid = {
  origin:    THREE.Vector3
  fileStepW: THREE.Vector3
  rankStepW: THREE.Vector3
}

type AnimState = {
  cur:    THREE.Vector3
  from:   THREE.Vector3
  to:     THREE.Vector3
  t:      number
  active: boolean
  arcH:   number
  dur:    number
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
    legalMoves, lastMove, isInCheck, checkedKingSquare, onAnimationComplete,
    isFlipped, fen,
  } = useGameStore()

  const grid      = useRef<LocalGrid | null>(null)
  const gridWorld = useRef<WorldGrid | null>(null)
  const gridFrameDelay    = useRef(0)
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
  const nodeRestY = useRef(new Map<string, number>())
  const eventQueue = useRef<AnimationEvent[]>([])
  const wasAnimatingRef = useRef(false)
  const isFlippedRef = useRef(isFlipped)
  isFlippedRef.current = isFlipped

  // ── Initialisation locale + matériaux ────────────────────────────────────
  useEffect(() => {
    // Références pour grille locale :
    //   a1 = Piece_02 (tour), h1 = Piece_02001 (tour), a2 = Piece_01 (pion)
    //   On n'utilise PAS Piece_03 (cavalier) dont le Y local est différent.
    const a1 = nodes['Piece_02']
    const h1 = nodes['Piece_02001']
    const a2 = nodes['Piece_01']
    if (!a1 || !h1 || !a2) return

    // fileStep depuis h1 (7 cases) divisé par 7, Y aplati
    const rawFile = new THREE.Vector3().subVectors(h1.position, a1.position).divideScalar(7)
    rawFile.y = 0

    const rawRank = new THREE.Vector3().subVectors(a2.position, a1.position)
    rawRank.y = 0

    grid.current = {
      origin:   a1.position.clone(),
      fileStep: rawFile,
      rankStep: rawRank,
    }

    // Cloner les matériaux et initialiser les animations
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
      nodeRestY.current.set(nodeId, pos.y)
      anims.current.set(nodeId, {
        cur: pos.clone(), from: pos.clone(), to: pos.clone(),
        t: 1, active: false, arcH: 0, dur: 0.5,
      })
    })
  }, [nodes])

  // ── Repère monde — attend 10 frames pour matrices finalisées ─────────────
  useFrame(() => {
    if (worldGridComputed.current || !grid.current) return
    gridFrameDelay.current++
    if (gridFrameDelay.current < 10) return

    const a1 = nodes['Piece_02']
    const h1 = nodes['Piece_02001']
    const a2 = nodes['Piece_01']
    if (!a1 || !h1 || !a2) return

    const a1w = new THREE.Vector3()
    const h1w = new THREE.Vector3()
    const a2w = new THREE.Vector3()
    a1.getWorldPosition(a1w)
    h1.getWorldPosition(h1w)
    a2.getWorldPosition(a2w)

    // fileStepW depuis h1 (7 cases), Y=0 (plan du plateau)
    const fileStepW = h1w.clone().sub(a1w).divideScalar(7)
    fileStepW.y = 0

    // rankStepW depuis a2, Y=0
    const rankStepW = a2w.clone().sub(a1w)
    rankStepW.y = 0

    gridWorld.current = { origin: a1w.clone(), fileStepW, rankStepW }

    // Précalcul du centre monde de chaque case (respecte isFlipped)
    const map = squareWorldCache.current
    for (let fi = 0; fi < 8; fi++) {
      for (let ri = 0; ri < 8; ri++) {
        const sq = `${FILES[fi]}${ri + 1}`
        const physFi = isFlippedRef.current ? 7 - fi : fi
        const physRi = isFlippedRef.current ? 7 - ri : ri
        map.set(sq, a1w.clone()
          .addScaledVector(fileStepW, physFi)
          .addScaledVector(rankStepW, physRi))
      }
    }

    worldGridComputed.current = true
    setGridReady(true)
  })

  // ── Reset au démarrage d'une partie ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || !grid.current) return
    eventQueue.current = []
    wasAnimatingRef.current = false
    sqToNode.current = new Map(Object.entries(INITIAL_PLACEMENT).map(([k, v]) => [v, k]))
    nodeToSq.current = new Map(Object.entries(INITIAL_PLACEMENT))
    Object.entries(INITIAL_PLACEMENT).forEach(([nodeId, sq]) => {
      const node = nodes[nodeId]
      if (!node) return
      node.visible = true
      const restY = nodeRestY.current.get(nodeId)
      const pos = squareLocalPos(sq, restY)
      node.position.copy(pos)
      const anim = anims.current.get(nodeId)
      if (anim) { anim.cur.copy(pos); anim.from.copy(pos); anim.to.copy(pos); anim.t = 1; anim.active = false }
    })
  }, [phase])

  // ── Position locale d'une case (respecte isFlipped) ─────────────────────
  const squareLocalPos = (sq: string, restY?: number): THREE.Vector3 => {
    if (!grid.current) return new THREE.Vector3()
    const rawFi = FILES.indexOf(sq[0])
    const rawRi = parseInt(sq[1]) - 1
    const fi = isFlippedRef.current ? 7 - rawFi : rawFi
    const ri = isFlippedRef.current ? 7 - rawRi : rawRi
    const { origin, fileStep, rankStep } = grid.current
    return new THREE.Vector3(
      origin.x + fi * fileStep.x + ri * rankStep.x,
      restY !== undefined ? restY : origin.y,
      origin.z + fi * fileStep.z + ri * rankStep.z,
    )
  }

  // ── Animation ─────────────────────────────────────────────────────────────
  const startAnim = (nodeId: string, toSq: string) => {
    const anim = anims.current.get(nodeId)
    if (!anim || !grid.current) return
    const restY = nodeRestY.current.get(nodeId)
    const to = squareLocalPos(toSq, restY)
    const dist = anim.cur.distanceTo(to)
    const sq = grid.current.fileStep.length() // taille d'une case en local
    anim.from  = anim.cur.clone()
    anim.to    = to.clone()
    anim.arcH  = sq * 3 + dist * 0.08
    anim.dur   = Math.min(0.3 + (dist / sq) * 0.06, 0.65)
    anim.t     = 0
    anim.active = true
  }

  // ── Rebuild complet depuis un FEN (utilisé par undo) ─────────────────────
  const resetBoardFromFen = (fen: string) => {
    if (!grid.current) return

    // Vider la file d'animation
    eventQueue.current = []

    // Construire le pool de nodes par (couleur+type)
    const pool: Record<string, string[]> = {}
    for (const nodeId of Object.keys(INITIAL_PLACEMENT)) {
      const key = getNodeColor(nodeId) + getNodePieceType(nodeId)
      if (!pool[key]) pool[key] = []
      pool[key].push(nodeId)
    }

    // Collecter les pièces requises depuis le FEN
    const needed: Record<string, string[]> = {}
    const tempChess = new Chess(fen)
    for (const rank of tempChess.board()) {
      for (const cell of rank) {
        if (!cell) continue
        const key = cell.color + cell.type
        if (!needed[key]) needed[key] = []
        needed[key].push(cell.square)
      }
    }

    // Réinitialiser les maps
    sqToNode.current.clear()
    nodeToSq.current.clear()

    // Assigner les nodes aux cases et positionner instantanément
    for (const [key, nodePool] of Object.entries(pool)) {
      const squares = needed[key] ?? []
      nodePool.forEach((nodeId, i) => {
        const node = nodes[nodeId]
        if (!node) return
        if (i < squares.length) {
          const sq = squares[i]
          sqToNode.current.set(sq, nodeId)
          nodeToSq.current.set(nodeId, sq)
          node.visible = true
          const restY = nodeRestY.current.get(nodeId)
          const pos = squareLocalPos(sq, restY)
          node.position.copy(pos)
          const anim = anims.current.get(nodeId)
          if (anim) { anim.cur.copy(pos); anim.from.copy(pos); anim.to.copy(pos); anim.t = 1; anim.active = false }
        } else {
          nodeToSq.current.set(nodeId, null)
          node.visible = false
        }
      })
    }
  }

  // ── Traitement d'un événement de jeu ──────────────────────────────────────
  const processEvent = (ev: AnimationEvent) => {
    if (!grid.current) return

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
      case 'move':       moveNode(ev.from, ev.to); break
      case 'capture':    captureAt(ev.to); moveNode(ev.from, ev.to); break
      case 'en-passant': captureAt(ev.capturedSquare); moveNode(ev.from, ev.to); break
      case 'castle': {
        const rank = ev.color === 'w' ? '1' : '8'
        moveNode(`e${rank}`, ev.side === 'kingside' ? `g${rank}` : `c${rank}`)
        moveNode(ev.side === 'kingside' ? `h${rank}` : `a${rank}`,
                 ev.side === 'kingside' ? `f${rank}` : `d${rank}`)
        break
      }
      case 'promotion': moveNode(ev.from, ev.square); break
    }
  }

  // ── File d'attente d'événements — empêche la perte si deux events arrivent
  // avant que React re-render (React 18 peut batcher plusieurs set() zustand)
  useEffect(() => {
    if (!lastAnimationEvent) return
    if (lastAnimationEvent.type === 'undo') {
      // Undo : repositionnement immédiat, bypass la file d'animation
      resetBoardFromFen(lastAnimationEvent.fen)
      return
    }
    eventQueue.current.push(lastAnimationEvent)
  }, [lastAnimationEvent])

  // ── Retournement plateau ───────────────────────────────────────────────────
  useEffect(() => {
    if (!grid.current) return
    // Recompute squareWorldCache avec la nouvelle orientation
    if (gridWorld.current) {
      const { origin, fileStepW, rankStepW } = gridWorld.current
      const map = squareWorldCache.current
      for (let fi = 0; fi < 8; fi++) {
        for (let ri = 0; ri < 8; ri++) {
          const sq = `${FILES[fi]}${ri + 1}`
          const physFi = isFlippedRef.current ? 7 - fi : fi
          const physRi = isFlippedRef.current ? 7 - ri : ri
          map.set(sq, origin.clone()
            .addScaledVector(fileStepW, physFi)
            .addScaledVector(rankStepW, physRi))
        }
      }
    }
    resetBoardFromFen(fen)
  }, [isFlipped])

  // ── Boucle d'animation + traitement séquentiel de la file ─────────────────
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

    // Traiter le prochain événement en file si aucune animation active
    let anyActive = [...anims.current.values()].some((a) => a.active)
    if (!anyActive && eventQueue.current.length > 0) {
      processEvent(eventQueue.current.shift()!)
      // Recalculer : processEvent peut avoir démarré une nouvelle animation
      anyActive = [...anims.current.values()].some((a) => a.active)
    }

    // Détecter la fin de toutes les animations (file vide + aucune anim active)
    const isAnimating = anyActive || eventQueue.current.length > 0
    if (wasAnimatingRef.current && !isAnimating) {
      onAnimationComplete()
    }
    wasAnimatingRef.current = isAnimating
  })

  // ── Highlight pièce sélectionnée ──────────────────────────────────────────
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

  // ── Résolution clic ───────────────────────────────────────────────────────
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

  const resolveClickedPos = (worldPoint: THREE.Vector3): Square | null => {
    if (!gridWorld.current) return null
    const { origin, fileStepW, rankStepW } = gridWorld.current
    const delta = new THREE.Vector3(worldPoint.x - origin.x, 0, worldPoint.z - origin.z)
    const rawFi = Math.round(delta.dot(fileStepW) / fileStepW.lengthSq())
    const rawRi = Math.round(delta.dot(rankStepW) / rankStepW.lengthSq())
    if (rawFi < 0 || rawFi > 7 || rawRi < 0 || rawRi > 7) return null
    const fi = isFlippedRef.current ? 7 - rawFi : rawFi
    const ri = isFlippedRef.current ? 7 - rawRi : rawRi
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
