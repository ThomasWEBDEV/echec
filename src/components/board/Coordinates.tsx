import { Text } from '@react-three/drei'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8']
const BOARD_OFFSET = -3.5

interface CoordinatesProps {
  isFlipped: boolean
}

export function Coordinates({ isFlipped }: CoordinatesProps) {
  const files = isFlipped ? [...FILES].reverse() : FILES
  const ranks = isFlipped ? RANKS : [...RANKS].reverse()

  return (
    <group name="coordinates">
      {files.map((file, i) => (
        <Text
          key={`file-${file}`}
          position={[i + BOARD_OFFSET, 0.04, 4.4]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.20}
          color="#c89a30"
          anchorX="center"
          anchorY="middle"
        >
          {file}
        </Text>
      ))}
      {ranks.map((rank, i) => (
        <Text
          key={`rank-${rank}`}
          position={[4.4, 0.04, i + BOARD_OFFSET]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.20}
          color="#c89a30"
          anchorX="center"
          anchorY="middle"
        >
          {rank}
        </Text>
      ))}
    </group>
  )
}
