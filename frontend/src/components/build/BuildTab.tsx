'use client'

import Image from 'next/image'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useMemo, useState } from 'react'
import {
  meshyPollImageTask,
  meshyPollTextTask,
  meshyStartImageTo3d,
  meshyStartTextPreview,
  meshyStartTextRefine,
} from '@/app/actions/meshy'
import type { MeshyImageTask, MeshyTextTask } from '@vividhome/backend'
import { useVividHomeStore } from '@/store/vividHomeStore'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function terminal(status: string) {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELED'
}

async function pollTextTask(taskId: string): Promise<MeshyTextTask> {
  for (let i = 0; i < 150; i++) {
    const r = await meshyPollTextTask(taskId)
    if (!r.ok) throw new Error(r.error)
    if (terminal(r.task.status)) return r.task
    await sleep(2500)
  }
  throw new Error('Generation timed out.')
}

async function pollImageTask(taskId: string): Promise<MeshyImageTask> {
  for (let i = 0; i < 150; i++) {
    const r = await meshyPollImageTask(taskId)
    if (!r.ok) throw new Error(r.error)
    if (terminal(r.task.status)) return r.task
    await sleep(2500)
  }
  throw new Error('Generation timed out.')
}

function PreviewModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(), [scene])
  return (
    <primitive object={cloned} rotation={[0, -0.6, 0]} scale={0.42} position={[0, -0.35, 0]} />
  )
}

export function BuildTab() {
  const [prompt, setPrompt] = useState(
    'modern minimalist wooden dining chair, high detail, realistic proportions',
  )
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [glbUrl, setGlbUrl] = useState<string | null>(null)

  const library = useVividHomeStore((s) => s.library)
  const addLibraryModel = useVividHomeStore((s) => s.addLibraryModel)

  const runTextPipeline = async () => {
    setError(null)
    setBusy(true)
    setGlbUrl(null)
    try {
      setPhase('Starting texture-ready preview…')
      const pr = await meshyStartTextPreview(prompt)
      if (!pr.ok) throw new Error(pr.error)
      const previewTask = await pollTextTask(pr.taskId)
      if (previewTask.status !== 'SUCCEEDED')
        throw new Error(previewTask.task_error?.message || 'Preview failed')

      setPhase('Refining materials (PBR)…')
      const rr = await meshyStartTextRefine(pr.taskId)
      if (!rr.ok) throw new Error(rr.error)
      const refined = await pollTextTask(rr.taskId)
      if (refined.status !== 'SUCCEEDED')
        throw new Error(refined.task_error?.message || 'Refine failed')

      const glb = refined.model_urls?.glb ?? null
      if (!glb) throw new Error('No GLB URL returned.')
      setGlbUrl(glb)
      setPhase('Done.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
      setPhase('')
    } finally {
      setBusy(false)
    }
  }

  const runImagePipeline = async () => {
    if (!file) {
      setError('Choose an image first.')
      return
    }
    setError(null)
    setBusy(true)
    setGlbUrl(null)
    try {
      setPhase('Uploading image & queueing Meshy…')
      const fd = new FormData()
      fd.set('image', file)
      const st = await meshyStartImageTo3d(fd)
      if (!st.ok) throw new Error(st.error)

      setPhase('Generating textured mesh…')
      const task = await pollImageTask(st.taskId)
      if (task.status !== 'SUCCEEDED')
        throw new Error(task.task_error?.message || 'Image-to-3D failed')

      const glb = task.model_urls?.glb ?? null
      if (!glb) throw new Error('No GLB URL returned.')
      setGlbUrl(glb)
      setPhase('Done.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
      setPhase('')
    } finally {
      setBusy(false)
    }
  }

  const saveToLibrary = () => {
    if (!glbUrl) return
    addLibraryModel({
      name: prompt.slice(0, 42) || 'Generated model',
      prompt,
      glbUrl,
      thumbnailUrl: previewUrl ?? undefined,
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-8">
          <section className="rounded-2xl border border-stone-200/80 bg-white/70 p-6 shadow-sm backdrop-blur">
            <h2 className="font-serif text-lg text-stone-900">Text-to-3D</h2>
            <p className="mt-1 text-sm text-stone-600">
              Preview mesh → refine pass with PBR maps (API runs server-side; key stays on the server).
            </p>
            <textarea
              className="mt-4 min-h-[120px] w-full rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2 text-sm text-stone-800 outline-none ring-stone-400/30 focus:ring-2"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void runTextPipeline()}
              className="mt-4 w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
            >
              Generate from text
            </button>
          </section>

          <section className="rounded-2xl border border-stone-200/80 bg-white/70 p-6 shadow-sm backdrop-blur">
            <h2 className="font-serif text-lg text-stone-900">Image-to-3D</h2>
            <p className="mt-1 text-sm text-stone-600">
              Drag a clear product photo — Meshy ingests a data URL server-side.
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-10 text-sm text-stone-600 hover:bg-stone-100/80">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setFile(f ?? null)
                  setPreviewUrl(f ? URL.createObjectURL(f) : null)
                }}
              />
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Upload preview"
                  width={220}
                  height={220}
                  className="rounded-lg object-cover"
                  unoptimized
                />
              ) : (
                <span>Drop an image or click to browse</span>
              )}
            </label>
            <button
              type="button"
              disabled={busy || !file}
              onClick={() => void runImagePipeline()}
              className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-50 disabled:opacity-50"
            >
              Generate from image
            </button>
          </section>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-lg text-stone-900">Live preview</h2>
              <span className="text-xs text-stone-500">
                {busy ? phase || 'Working…' : glbUrl ? 'Ready' : 'Idle'}
              </span>
            </div>
            {error ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
            ) : null}
            <div className="mt-4 aspect-square w-full overflow-hidden rounded-xl bg-stone-100">
              {glbUrl ? (
                <Canvas camera={{ position: [1.2, 0.9, 1.6], fov: 45 }}>
                  <ambientLight intensity={0.35} />
                  <Suspense fallback={null}>
                    <Environment preset="city" environmentIntensity={0.9} />
                    <PreviewModel url={glbUrl} />
                    <OrbitControls enableDamping makeDefault />
                  </Suspense>
                </Canvas>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-500">
                  Generated GLB appears here
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!glbUrl}
              onClick={saveToLibrary}
              className="mt-4 w-full rounded-xl bg-amber-900/90 px-4 py-3 text-sm font-medium text-amber-50 hover:bg-amber-900 disabled:opacity-40"
            >
              Save to My Library
            </button>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-5 shadow-sm">
            <h3 className="font-serif text-base text-stone-900">Session library</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {library.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 text-xs text-stone-700"
                >
                  <p className="font-medium text-stone-900">{m.name}</p>
                  <p className="truncate text-stone-500">{m.glbUrl}</p>
                </li>
              ))}
              {library.length === 0 ? (
                <li className="text-sm text-stone-500">No saved models yet.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
