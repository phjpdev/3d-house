/**
 * Upper bound for `.glb` / `.gltf` saved from Meshy or uploaded via the models API.
 * Detailed textured Meshy outputs commonly exceed 50MB.
 */
export const MAX_LIBRARY_MODEL_BYTES = 256 * 1024 * 1024
