import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

let rectAreaLightLibReady = false

/**
 * ACES + PCF shadows + sRGB: tuned for interior daylight + PBR (PCF over PCFSoft for frame time).
 * Post-processing may disable renderer tone mapping (see RealisticEffects).
 */
export function configureRenderer(gl: THREE.WebGLRenderer) {
  if (!rectAreaLightLibReady) {
    RectAreaLightUniformsLib.init()
    rectAreaLightLibReady = true
  }
  gl.shadowMap.enabled = true
  gl.shadowMap.type = THREE.PCFShadowMap
  gl.outputColorSpace = THREE.SRGBColorSpace
  gl.toneMapping = THREE.ACESFilmicToneMapping
  gl.toneMappingExposure = 0.96
}
