'use server'

import {
  createImageTo3D,
  createTextPreview,
  createTextRefine,
  getGlbFromImageTask,
  getGlbFromTextTask,
  getImageTask,
  getTextTask,
  type MeshyImageTask,
  type MeshyTextTask,
} from '@vividhome/backend'

function key() {
  const k = process.env.MESHY_API_KEY
  if (!k) throw new Error('MESHY_API_KEY is not configured')
  return k
}

export type MeshyPollTextResult =
  | { ok: true; task: MeshyTextTask }
  | { ok: false; error: string }

export async function meshyPollTextTask(taskId: string): Promise<MeshyPollTextResult> {
  try {
    const task = await getTextTask(key(), taskId)
    return { ok: true, task }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Poll failed' }
  }
}

export async function meshyStartTextPreview(prompt: string) {
  try {
    const { result } = await createTextPreview(key(), prompt.trim())
    return { ok: true as const, taskId: result }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Request failed' }
  }
}

export async function meshyStartTextRefine(previewTaskId: string) {
  try {
    const { result } = await createTextRefine(key(), previewTaskId)
    return { ok: true as const, taskId: result }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Request failed' }
  }
}

export type MeshyPollImageResult =
  | { ok: true; task: MeshyImageTask }
  | { ok: false; error: string }

export async function meshyPollImageTask(taskId: string): Promise<MeshyPollImageResult> {
  try {
    const task = await getImageTask(key(), taskId)
    return { ok: true, task }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Poll failed' }
  }
}

export async function meshyStartImageTo3d(formData: FormData) {
  const file = formData.get('image')
  if (!(file instanceof Blob)) {
    return { ok: false as const, error: 'Missing image file' }
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const mime = file.type || 'image/jpeg'
  const b64 = buf.toString('base64')
  const dataUri = `data:${mime};base64,${b64}`
  try {
    const { result } = await createImageTo3D(key(), dataUri)
    return { ok: true as const, taskId: result }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Request failed' }
  }
}

export async function meshyExtractGlbText(task: MeshyTextTask) {
  return getGlbFromTextTask(task) ?? null
}

export async function meshyExtractGlbImage(task: MeshyImageTask) {
  return getGlbFromImageTask(task) ?? null
}
