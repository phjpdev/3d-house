'use client'

import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'

/** Composer disables renderer tone mapping — restore ACES via ToneMapping pass + photographic accents. */
export function RealisticEffects() {
  /* MSAA inside the composer duplicates cost each frame; SMAA already handles edges. */
  return (
    <EffectComposer multisampling={0}>
      <ToneMapping />
      <Bloom luminanceThreshold={0.82} intensity={0.32} mipmapBlur={false} />
      <Vignette eskil={false} offset={0.12} darkness={0.38} />
      <SMAA />
    </EffectComposer>
  )
}
