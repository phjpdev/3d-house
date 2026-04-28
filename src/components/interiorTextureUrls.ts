/** MIT three.js repo — stable CDN for PBR test textures (diffuse / roughness / bump / normals). */
export const THREE_JS_TEXTURE_BASE =
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures' as const

export const interiorTexturePaths = {
  floorDiffuse: `${THREE_JS_TEXTURE_BASE}/hardwood2_diffuse.jpg`,
  floorRoughness: `${THREE_JS_TEXTURE_BASE}/hardwood2_roughness.jpg`,
  floorBump: `${THREE_JS_TEXTURE_BASE}/hardwood2_bump.jpg`,
  wallNormal: `${THREE_JS_TEXTURE_BASE}/waternormals.jpg`,
} as const
