'use client'

import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'

/** Composer disables renderer tone mapping — restore ACES via ToneMapping pass + photographic accents. */
export function RealisticEffects() {
  return (
    <EffectComposer multisampling={8}>
      <ToneMapping />
      <Bloom luminanceThreshold={0.82} intensity={0.32} mipmapBlur={false} />
      <Vignette eskil={false} offset={0.12} darkness={0.38} />
      <SMAA />
    </EffectComposer>
  )
}
