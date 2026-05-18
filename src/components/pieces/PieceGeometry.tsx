import * as THREE from 'three'
import type { PieceSymbol } from 'chess.js'

interface PieceGeometryProps {
  type: PieceSymbol
  material: THREE.Material
}

function lathe(points: [number, number][], segments = 48): THREE.LatheGeometry {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments)
}

function Pawn({ mat }: { mat: THREE.Material }) {
  return (
    <group>
      <mesh castShadow material={mat}>
        <primitive object={lathe([
          [0,0],[0.26,0],[0.28,0.02],[0.22,0.06],[0.16,0.10],
          [0.13,0.18],[0.12,0.28],[0.13,0.34],[0.10,0.38],[0.00,0.38],
        ])} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 0.40, 0]}>
        <cylinderGeometry args={[0.06, 0.10, 0.16, 16]} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 0.52, 0]}>
        <sphereGeometry args={[0.16, 24, 24]} />
      </mesh>
    </group>
  )
}

function Rook({ mat }: { mat: THREE.Material }) {
  return (
    <group>
      <mesh castShadow material={mat}>
        <primitive object={lathe([
          [0,0],[0.30,0],[0.32,0.02],[0.28,0.06],[0.22,0.10],
          [0.20,0.16],[0.19,0.80],[0.22,0.84],[0.28,0.88],[0.28,1.00],[0.00,1.00],
        ])} />
      </mesh>
      {[0, Math.PI/2, Math.PI, Math.PI*3/2].map((angle, i) => (
        <mesh key={i} castShadow material={mat}
          position={[Math.sin(angle)*0.20, 1.08, Math.cos(angle)*0.20]}>
          <boxGeometry args={[0.14, 0.18, 0.14]} />
        </mesh>
      ))}
    </group>
  )
}

function Knight({ mat }: { mat: THREE.Material }) {
  return (
    <group>
      <mesh castShadow material={mat}>
        <primitive object={lathe([
          [0,0],[0.28,0],[0.30,0.02],[0.24,0.06],[0.18,0.10],
          [0.16,0.18],[0.15,0.30],[0.16,0.38],[0.00,0.38],
        ])} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 0.52, 0.04]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.10, 0.14, 0.28, 16]} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 0.74, 0.10]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.18, 0.28, 0.22]} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 0.64, 0.26]} rotation={[-0.8, 0, 0]}>
        <boxGeometry args={[0.14, 0.12, 0.16]} />
      </mesh>
      <mesh castShadow material={mat} position={[0.06, 0.90, 0.06]}>
        <coneGeometry args={[0.04, 0.10, 8]} />
      </mesh>
      <mesh castShadow material={mat} position={[-0.06, 0.90, 0.06]}>
        <coneGeometry args={[0.04, 0.10, 8]} />
      </mesh>
    </group>
  )
}

function Bishop({ mat }: { mat: THREE.Material }) {
  return (
    <group>
      <mesh castShadow material={mat}>
        <primitive object={lathe([
          [0,0],[0.26,0],[0.28,0.02],[0.22,0.06],[0.16,0.12],
          [0.12,0.22],[0.10,0.40],[0.11,0.58],[0.14,0.66],
          [0.12,0.74],[0.08,0.80],[0.06,0.86],[0.00,0.86],
        ])} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 0.98, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.12, 16]} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 1.06, 0]}>
        <sphereGeometry args={[0.10, 24, 24]} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 1.28, 0]}>
        <coneGeometry args={[0.05, 0.36, 16]} />
      </mesh>
    </group>
  )
}

function Queen({ mat }: { mat: THREE.Material }) {
  return (
    <group>
      <mesh castShadow material={mat}>
        <primitive object={lathe([
          [0,0],[0.30,0],[0.32,0.02],[0.26,0.06],[0.20,0.12],
          [0.16,0.24],[0.14,0.44],[0.16,0.62],[0.20,0.74],
          [0.24,0.84],[0.22,0.94],[0.16,1.00],[0.00,1.00],
        ])} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 1.06, 0]}>
        <torusGeometry args={[0.16, 0.04, 12, 32]} />
      </mesh>
      {[0,1,2,3,4].map((i) => {
        const angle = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} castShadow material={mat}
            position={[Math.sin(angle)*0.16, 1.18, Math.cos(angle)*0.16]}>
            <sphereGeometry args={[0.06, 16, 16]} />
          </mesh>
        )
      })}
      <mesh castShadow material={mat} position={[0, 1.28, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
      </mesh>
    </group>
  )
}

function King({ mat }: { mat: THREE.Material }) {
  return (
    <group>
      <mesh castShadow material={mat}>
        <primitive object={lathe([
          [0,0],[0.32,0],[0.34,0.02],[0.28,0.06],[0.22,0.12],
          [0.17,0.24],[0.15,0.44],[0.17,0.62],[0.22,0.74],
          [0.26,0.86],[0.24,0.96],[0.18,1.02],[0.00,1.02],
        ])} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 1.08, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.06, 24]} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 1.22, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.20, 12]} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 1.44, 0]}>
        <boxGeometry args={[0.08, 0.40, 0.08]} />
      </mesh>
      <mesh castShadow material={mat} position={[0, 1.54, 0]}>
        <boxGeometry args={[0.30, 0.08, 0.08]} />
      </mesh>
    </group>
  )
}

export function PieceGeometry({ type, material }: PieceGeometryProps) {
  switch (type) {
    case 'p': return <Pawn mat={material} />
    case 'r': return <Rook mat={material} />
    case 'n': return <Knight mat={material} />
    case 'b': return <Bishop mat={material} />
    case 'q': return <Queen mat={material} />
    case 'k': return <King mat={material} />
    default:  return null
  }
}
