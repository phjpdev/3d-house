'use client'

import { useEffect } from 'react'

/** Known upstream Three/R3F noise while libraries migrate off deprecated APIs. */
const SUPPRESSED_SUBSTRINGS = [
  'THREE.Clock: This module has been deprecated',
  'THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated',
]

let installed = false

export function ThreeConsoleNoiseFilter() {
  useEffect(() => {
    if (installed) return
    installed = true
    const orig = console.warn
    console.warn = (...args: unknown[]) => {
      const msg = args[0]
      if (typeof msg === 'string' && SUPPRESSED_SUBSTRINGS.some((s) => msg.includes(s))) return
      orig.apply(console, args as Parameters<typeof console.warn>)
    }
  }, [])
  return null
}
