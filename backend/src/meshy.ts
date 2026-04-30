/**
 * Meshy REST client — called only from trusted server code (Next.js server actions / API routes).
 * Docs: https://docs.meshy.ai/api/text-to-3d , https://docs.meshy.ai/api/image-to-3d
 */

const API_BASE = 'https://api.meshy.ai'

export type MeshyTaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'

export type MeshyTextTask = {
  id: string
  status: MeshyTaskStatus
  progress?: number
  model_urls?: { glb?: string; obj?: string }
  thumbnail_url?: string
  task_error?: { message?: string }
  prompt?: string
}

export type MeshyImageTask = {
  id: string
  status: MeshyTaskStatus
  progress?: number
  model_urls?: { glb?: string }
  thumbnail_url?: string
  task_error?: { message?: string }
}

type CreateResult = { result: string }

function authHeader(key: string) {
  return { Authorization: `Bearer ${key}` }
}

export async function createTextPreview(
  apiKey: string,
  prompt: string,
): Promise<CreateResult> {
  const r = await fetch(`${API_BASE}/openapi/v2/text-to-3d`, {
    method: 'POST',
    headers: { ...authHeader(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'preview',
      prompt: prompt.slice(0, 600),
      ai_model: 'latest',
      target_formats: ['glb'],
      should_remesh: false,
    }),
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`Meshy preview: ${r.status} ${t}`)
  }
  return r.json() as Promise<CreateResult>
}

export async function createTextRefine(
  apiKey: string,
  previewTaskId: string,
): Promise<CreateResult> {
  const r = await fetch(`${API_BASE}/openapi/v2/text-to-3d`, {
    method: 'POST',
    headers: { ...authHeader(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'refine',
      preview_task_id: previewTaskId,
      enable_pbr: true,
      ai_model: 'latest',
      target_formats: ['glb'],
    }),
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`Meshy refine: ${r.status} ${t}`)
  }
  return r.json() as Promise<CreateResult>
}

export async function getTextTask(
  apiKey: string,
  taskId: string,
): Promise<MeshyTextTask> {
  const r = await fetch(`${API_BASE}/openapi/v2/text-to-3d/${taskId}`, {
    headers: authHeader(apiKey),
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`Meshy get text task: ${r.status} ${t}`)
  }
  return r.json() as Promise<MeshyTextTask>
}

export async function createImageTo3D(
  apiKey: string,
  imageDataUri: string,
): Promise<CreateResult> {
  const r = await fetch(`${API_BASE}/openapi/v1/image-to-3d`, {
    method: 'POST',
    headers: { ...authHeader(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageDataUri,
      ai_model: 'latest',
      should_texture: true,
      enable_pbr: true,
      should_remesh: false,
      target_formats: ['glb'],
    }),
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`Meshy image-to-3d: ${r.status} ${t}`)
  }
  return r.json() as Promise<CreateResult>
}

export async function getImageTask(
  apiKey: string,
  taskId: string,
): Promise<MeshyImageTask> {
  const r = await fetch(`${API_BASE}/openapi/v1/image-to-3d/${taskId}`, {
    headers: authHeader(apiKey),
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`Meshy get image task: ${r.status} ${t}`)
  }
  return r.json() as Promise<MeshyImageTask>
}

export function isTaskDone(s: MeshyTaskStatus) {
  return s === 'SUCCEEDED' || s === 'FAILED' || s === 'CANCELED'
}

export function getGlbFromTextTask(t: MeshyTextTask) {
  return t.model_urls?.glb
}

export function getGlbFromImageTask(t: MeshyImageTask) {
  return t.model_urls?.glb
}
