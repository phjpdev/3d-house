/**
 * Validates a single filename segment for `public/models` (glb/gltf only).
 * Blocks traversal and unsafe characters; allows spaces in names.
 */
export function safeModelBasename(name: string): string | null {
  let base = name.replace(/\\/g, '/').split('/').pop() ?? ''
  try {
    base = decodeURIComponent(base.trim())
  } catch {
    return null
  }
  if (!base || base.includes('..') || !/\.(glb|gltf)$/i.test(base)) return null
  if (/[/\\:\x00-\x1f<>:"|?*]/.test(base)) return null
  return base
}
