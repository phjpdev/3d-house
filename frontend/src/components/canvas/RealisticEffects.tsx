'use client'

import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'

/** Composer disables renderer tone mapping — restore ACES via ToneMapping pass + photographic accents. */
export function RealisticEffects() {
  return (
    <EffectComposer multisampling={4}>
      <ToneMapping />
      <Bloom luminanceThreshold={0.82} intensity={0.34} mipmapBlur />
      <Vignette eskil={false} offset={0.12} darkness={0.4} />
    </EffectComposer>
  )
}
