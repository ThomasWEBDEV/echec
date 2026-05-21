// ============================================================
// ChessModel — intègre le GLB chess_set avec la logique de jeu
//
// Stratégie :
//   1. Charger le GLB (plateau + pièces à leurs positions initiales)
//   2. Dériver le repère GLB depuis 3 nodes de référence (a1, b1, a2)
//   3. Tracker : square → nodeId  et  nodeId → square | null (capturé)
//   4. Sur chaque lastAnimationEvent : déplacer / masquer les nodes
//   5. Animer via node.position en arc parabolique dans useFrame
// ============================================================

import { useGLTF } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/useGameStore'

const MODEL_PATH = '/models/chess_set.glb'
// Le GLB Sketchfab embarque un scale 0.01 (nœud fbx) + rotation -90°X (Sketchfab_model).
// Après ces transforms internes, le plateau fait ~1.347 unités de large.
// On veut 8 unités → scale = 8/1.347 ≈ 5.94, mais les centres de cases
// donnent une correspondance plus précise à 5.19 (mesuré sur a1↔h1 et a1↔a8).
// On ajoute rotation Y=π pour aligner a1 (coin blanc) avec Board.tsx.
const MODEL_SCALE = 5.19
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

// Correspondance node GLB → case initiale (32 pièces)
const INITIAL_PLACEMENT: Record<string, string> = {
  'Piece_02':     'a1', 'Piece_03':     'b1', 'Piece_04':     'c1', 'Piece_05':    'd1',
  'Piece_06':     'e1', 'Piece_04.001': 'f1', 'Piece_03.001': 'g1', 'Piece_02.001':'h1',
  'Piece_01.007': 'a2', 'Piece_01.006': 'b2', 'Piece_01.005': 'c2', 'Piece_01.004':'d2',
  'Piece_01.003': 'e2', 'Piece_01.002': 'f2', 'Piece_01.001': 'g2', 'Piece_01':    'h2',
  'Piece_02.003': 'a8', 'Piece_03.003': 'b8', 'Piece_04.003': 'c8', 'Piece_05.001':'d8',
  'Piece_06.001': 'e8', 'Piece_04.002': 'f8', 'Piece_03.002': 'g8', 'Piece_02.002':'h8',
  'Piece_01.015': 'a7', 'Piece_01.014': 'b7', 'Piece_01.013': 'c7', 'Piece_01.012':'d7',
  'Piece_01.011': 'e7', 'Piece_01.010': 'f7', 'Piece_01.009': 'g7', 'Piece_01.008':'h7',
}

// Repère GLB (espace local, avant MODEL_SCALE)
type GlbGrid = {
  origin: THREE.Vector3  // position locale de a1
  fileStep: THREE.Vector3  // delta par colonne (a→b)
  rankStep: THREE.Vector3  // delta par rangée (1→2)
}

// État d'animation d'une pièce (espace local GLB)
type AnimState = {
  cur: THREE.Vector3
  from: THREE.Vector3
  to: THREE.Vector3
  t: number        // progression 0..1
  active: boolean
  arcH: number     // hauteur de l'arc en unités GLB
  dur: number      // durée en secondes
}

export function ChessScene() {
  const { scene, nodes } = useGLTF(MODEL_PATH) as any
  const { lastAnimationEvent, selectedSquare, phase } = useGameStore()

  // Repère GLB dérivé des positions initiales
  const grid = useRef<GlbGrid | null>(null)

  // Tracking bidirectionnel case ↔ nodeId
  const sqToNode = useRef(
    new Map<string, string>(Object.entries(INITIAL_PLACEMENT).map(([k, v]) => [v, k]))
  )
  const nodeToSq = useRef(
    new Map<string, string | null>(Object.entries(INITIAL_PLACEMENT))
  )

  // États d'animation par nodeId
  const anims = useRef(new Map<string, AnimState>())

  // ── Initialisation : repère + matériaux clonés + états anim ──────────────
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

    // Cacher le plateau GLB — Board.tsx sert de plateau interactif
    const boardNode = nodes['Chess_board']
    if (boardNode) boardNode.visible = false

    Object.keys(INITIAL_PLACEMENT).forEach((nodeId) => {
      const node = nodes[nodeId]
      if (!node) return

      // Cloner les matériaux pour éviter le highlight partagé
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

  // ── Reset des pièces à la position initiale au démarrage d'une partie ────
  useEffect(() => {
    if (phase !== 'playing' || !grid.current) return

    // Réinitialiser les trackers
    sqToNode.current = new Map(Object.entries(INITIAL_PLACEMENT).map(([k, v]) => [v, k]))
    nodeToSq.current = new Map(Object.entries(INITIAL_PLACEMENT))

    // Remettre chaque node à sa position initiale et le rendre visible
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

  // ── Calcul de la position GLB (locale) d'une case quelconque ─────────────
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

  // ── Démarrer l'animation d'un node vers une case cible ───────────────────
  const startAnim = (nodeId: string, toSq: string) => {
    const anim = anims.current.get(nodeId)
    if (!anim) return
    const to = squareLocalPos(toSq)
    const dist = anim.cur.distanceTo(to)  // distance en unités GLB
    anim.from  = anim.cur.clone()
    anim.to    = to.clone()
    // Arc proportionnel à la distance (14 GLB ≈ 0.8 unité monde)
    anim.arcH  = 14 + dist * 0.15
    // Durée entre 0.3s et 0.65s
    anim.dur   = Math.min(0.3 + dist * 0.003, 0.65)
    anim.t     = 0
    anim.active = true
  }

  // ── Traitement des événements de jeu ─────────────────────────────────────
  useEffect(() => {
    if (!lastAnimationEvent || !grid.current) return
    const ev = lastAnimationEvent

    // Capturer : masquer le node sur une case
    const captureAt = (sq: string) => {
      const id = sqToNode.current.get(sq)
      if (!id) return
      nodeToSq.current.set(id, null)
      sqToNode.current.delete(sq)
      const node = nodes[id]
      if (node) node.visible = false
    }

    // Déplacer : animer le node d'une case à l'autre
    const moveNode = (from: string, to: string) => {
      const id = sqToNode.current.get(from)
      if (!id) return
      sqToNode.current.delete(from)
      sqToNode.current.set(to, id)
      nodeToSq.current.set(id, to)
      startAnim(id, to)
    }

    switch (ev.type) {
      case 'move':
        moveNode(ev.from, ev.to)
        break

      case 'capture':
        captureAt(ev.to)
        moveNode(ev.from, ev.to)
        break

      case 'en-passant':
        captureAt(ev.capturedSquare)
        moveNode(ev.from, ev.to)
        break

      case 'castle': {
        const rank = ev.color === 'w' ? '1' : '8'
        const kingTo = ev.side === 'kingside' ? `g${rank}` : `c${rank}`
        const rookFrom = ev.side === 'kingside' ? `h${rank}` : `a${rank}`
        const rookTo  = ev.side === 'kingside' ? `f${rank}` : `d${rank}`
        moveNode(`e${rank}`, kingTo)
        moveNode(rookFrom, rookTo)
        break
      }

      case 'promotion':
        if (ev.wasCaptured) captureAt(ev.square)
        moveNode(ev.from, ev.square)
        // Le pion reste visuellement un pion — la logique chess.js est correcte
        break
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
        anim.t = 1
        anim.active = false
        anim.cur.copy(anim.to)
      } else {
        // Easing cubic in-out
        const e = anim.t < 0.5
          ? 4 * anim.t ** 3
          : 1 - (-2 * anim.t + 2) ** 3 / 2
        anim.cur.lerpVectors(anim.from, anim.to, e)
        // Arc parabolique sur Y
        anim.cur.y =
          THREE.MathUtils.lerp(anim.from.y, anim.to.y, e) +
          Math.sin(e * Math.PI) * anim.arcH
      }

      node.position.copy(anim.cur)
    })
  })

  // ── Highlight de la pièce sélectionnée ───────────────────────────────────
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

  return <primitive object={scene} scale={MODEL_SCALE} rotation={[0, Math.PI, 0]} />
}

useGLTF.preload(MODEL_PATH)
