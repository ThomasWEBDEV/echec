import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

export function PostProcessing() {
  return (
    <EffectComposer>
      {/* Bloom — lueur dorée sur les pièces et le plateau */}
      <Bloom
        intensity={0.8}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.4}
        mipmapBlur
      />

      {/* Film grain — texture cinématique */}
      <Noise
        opacity={0.04}
        blendFunction={BlendFunction.ADD}
      />

      {/* Vignette — assombrit les bords, concentre le regard */}
      <Vignette
        offset={0.3}
        darkness={0.8}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
