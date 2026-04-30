'use client'

import Image from 'next/image'
import { Canvas } from '@react-three/fiber'
import { Environment, Html, OrbitControls, useGLTF } from '@react-three/drei'
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  Suspense,
  useMemo,
  useState,
} from 'react'
import { useMeshyGlbBlobUrl } from '@/hooks/useMeshyGlbBlobUrl'
import {
  meshyPollImageTask,
  meshyPollTextTask,
  meshyStartImageTo3d,
  meshyStartTextPreview,
  meshyStartTextRefine,
} from '@/app/actions/meshy'
import type { MeshyImageTask, MeshyTextTask } from '@vividhome/backend'
import { isMeshySignedAssetUrl } from '@/lib/meshyAssets'
import { fileToPersistableThumbnail, toPersistableThumbnailUrl } from '@/lib/persistableThumbnail'
import { useVividHomeStore } from '@/store/vividHomeStore'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function terminal(status: string) {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELED'
}

async function pollTextTask(
  taskId: string,
  onTick: (task: MeshyTextTask, attempt: number) => void,
): Promise<MeshyTextTask> {
  for (let i = 0; i < 150; i++) {
    const r = await meshyPollTextTask(taskId)
    if (!r.ok) throw new Error(r.error)
    onTick(r.task, i)
    if (terminal(r.task.status)) return r.task
    await sleep(2500)
  }
  throw new Error('Generation timed out (Meshy did not finish in time).')
}

async function pollImageTask(
  taskId: string,
  onTick: (task: MeshyImageTask, attempt: number) => void,
): Promise<MeshyImageTask> {
  for (let i = 0; i < 150; i++) {
    const r = await meshyPollImageTask(taskId)
    if (!r.ok) throw new Error(r.error)
    onTick(r.task, i)
    if (terminal(r.task.status)) return r.task
    await sleep(2500)
  }
  throw new Error('Generation timed out (Meshy did not finish in time).')
}

/** DOM inside Canvas must use `<Html />` from drei — raw `<div>` is invalid for R3F. */
function ModelLoadFallback() {
  return (
    <Html center>
      <div className="flex min-w-[220px] flex-col items-center justify-center gap-3 rounded-xl bg-white/90 px-4 py-4 text-stone-500 shadow-sm backdrop-blur-sm">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-amber-800"
          aria-hidden
        />
        <p className="text-sm">Loading 3D model from Meshy…</p>
      </div>
    </Html>
  )
}

class GlbErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { error: string | null }
> {
  state = { error: null as string | null }

  static getDerivedStateFromError(e: Error) {
    return { error: e.message }
  }

  componentDidCatch(e: Error, info: ErrorInfo) {
    console.error('GLB preview error', e, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="text-sm text-red-800">Could not display this model in the browser.</p>
          <p className="text-xs text-stone-500">{this.state.error}</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null })
              this.props.onReset()
            }}
            className="text-sm text-amber-900 underline"
          >
            Dismiss
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function PreviewModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(), [scene])
  return (
    <primitive object={cloned} rotation={[0, -0.6, 0]} scale={0.42} position={[0, -0.35, 0]} />
  )
}

function ProgressBar({ busy, progress }: { busy: boolean; progress: number | null }) {
  const hasNum = typeof progress === 'number' && !Number.isNaN(progress)
  const indeterminate = busy && !hasNum
  const width = hasNum ? `${Math.min(100, Math.max(0, progress!))}%` : '0%'

  return (
    <div className="mt-2 space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className={
            'h-full rounded-full bg-amber-800/85 transition-[width] duration-700 ease-out ' +
            (indeterminate ? 'w-[40%] animate-pulse' : '')
          }
          style={indeterminate ? undefined : { width }}
        />
      </div>
      {indeterminate ? (
        <p className="text-[11px] text-stone-400">
          No numeric progress from Meshy yet — polling every 2.5s.
        </p>
      ) : null}
    </div>
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
  const [meshProgress, setMeshProgress] = useState<number | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [saveBusy, setSaveBusy] = useState(false)

  const glbPreview = useMeshyGlbBlobUrl(glbUrl)
  const combinedError = error ?? glbPreview.error

  const library = useVividHomeStore((s) => s.library)
  const addLibraryModel = useVividHomeStore((s) => s.addLibraryModel)

  const runTextPipeline = async () => {
    const p = prompt.trim()
    if (!p) {
      setError('Enter a text prompt first.')
      return
    }
    setError(null)
    setBusy(true)
    setGlbUrl(null)
    setMeshProgress(null)
    try {
      setPhase('Queueing text preview on Meshy…')
      const pr = await meshyStartTextPreview(p)
      if (!pr.ok) throw new Error(pr.error)

      setPhase('Preview: starting…')
      const previewTask = await pollTextTask(pr.taskId, (task) => {
        setMeshProgress(
          typeof task.progress === 'number' && !Number.isNaN(task.progress)
            ? task.progress
            : null,
        )
        const pct =
          task.progress != null && !Number.isNaN(task.progress)
            ? `${Math.round(task.progress)}%`
            : '—'
        setPhase(`Preview geometry · ${task.status} · ${pct}`)
      })
      if (previewTask.status !== 'SUCCEEDED')
        throw new Error(previewTask.task_error?.message || 'Preview failed')
      setMeshProgress(null)

      setPhase('Refine: queueing PBR / texture pass…')
      const rr = await meshyStartTextRefine(pr.taskId)
      if (!rr.ok) throw new Error(rr.error)

      const refined = await pollTextTask(rr.taskId, (task) => {
        setMeshProgress(
          typeof task.progress === 'number' && !Number.isNaN(task.progress)
            ? task.progress
            : null,
        )
        const pct =
          task.progress != null && !Number.isNaN(task.progress)
            ? `${Math.round(task.progress)}%`
            : '—'
        setPhase(`Refining materials · ${task.status} · ${pct}`)
      })
      if (refined.status !== 'SUCCEEDED')
        throw new Error(refined.task_error?.message || 'Refine failed')

      const glb = refined.model_urls?.glb ?? null
      if (!glb) throw new Error('No GLB URL returned by Meshy.')
      setGlbUrl(glb)
      setPreviewKey((k) => k + 1)
      setPhase('Done.')
      setMeshProgress(100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
      setPhase('')
      setMeshProgress(null)
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
    setMeshProgress(null)
    try {
      setPhase('Uploading image & queueing Meshy…')
      const fd = new FormData()
      fd.set('image', file)
      const st = await meshyStartImageTo3d(fd)
      if (!st.ok) throw new Error(st.error)

      const task = await pollImageTask(st.taskId, (t) => {
        setMeshProgress(
          typeof t.progress === 'number' && !Number.isNaN(t.progress) ? t.progress : null,
        )
        const pct =
          t.progress != null && !Number.isNaN(t.progress) ? `${Math.round(t.progress)}%` : '—'
        setPhase(`Image → 3D · ${t.status} · ${pct}`)
      })
      if (task.status !== 'SUCCEEDED')
        throw new Error(task.task_error?.message || 'Image-to-3D failed')

      const glb = task.model_urls?.glb ?? null
      if (!glb) throw new Error('No GLB URL returned by Meshy.')
      setGlbUrl(glb)
      setPreviewKey((k) => k + 1)
      setPhase('Done.')
      setMeshProgress(100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
      setPhase('')
      setMeshProgress(null)
    } finally {
      setBusy(false)
    }
  }

  const saveToLibrary = async () => {
    if (!glbUrl) return
    setError(null)

    let libraryUrl = glbUrl

    if (isMeshySignedAssetUrl(glbUrl)) {
      setSaveBusy(true)
      try {
        const res = await fetch('/api/save-library-glb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceUrl: glbUrl, nameHint: prompt }),
        })
        const data = (await res.json()) as { ok?: boolean; publicUrl?: string; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Could not save model')
        libraryUrl = data.publicUrl!
        setGlbUrl(libraryUrl)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed')
        return
      } finally {
        setSaveBusy(false)
      }
    }

    if (library.some((m) => m.glbUrl === libraryUrl)) {
      setError('This model is already in your library.')
      return
    }

    let thumbnailUrl: string | undefined
    if (file && previewUrl?.startsWith('blob:')) {
      thumbnailUrl = (await fileToPersistableThumbnail(file)) ?? undefined
    } else {
      thumbnailUrl = (await toPersistableThumbnailUrl(previewUrl)) ?? undefined
    }

    addLibraryModel({
      name: prompt.slice(0, 42) || 'Generated model',
      prompt,
      glbUrl: libraryUrl,
      thumbnailUrl,
    })
  }

  const statusLine = busy
    ? phase || 'Contacting Meshy…'
    : glbUrl && glbPreview.loading
      ? 'Downloading model for preview…'
      : glbUrl
        ? 'Ready'
        : 'Idle'

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-8">
          <section className="rounded-2xl border border-stone-200/80 bg-white/70 p-6 shadow-sm backdrop-blur">
            <h2 className="font-serif text-lg text-stone-900">Text-to-3D</h2>
            <p className="mt-1 text-sm text-stone-600">
              Preview mesh → refine pass with PBR maps. Your Meshy key is read only on the Next.js
              server (see <code className="rounded bg-stone-100 px-1">.env.example</code>).
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
              Clear product-style photo — sent as a data URL to the server action, then to Meshy.
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
              <span className="max-w-[58%] text-right text-xs text-stone-600">{statusLine}</span>
            </div>

            <ProgressBar busy={busy} progress={meshProgress} />

            {combinedError ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {combinedError}
              </p>
            ) : null}

            <div className="mt-4 aspect-square w-full overflow-hidden rounded-xl bg-stone-100">
              {glbUrl && glbPreview.loadUrl ? (
                <GlbErrorBoundary key={previewKey} onReset={() => setGlbUrl(null)}>
                  <Canvas camera={{ position: [1.2, 0.9, 1.6], fov: 45 }}>
                    <ambientLight intensity={0.35} />
                    <Suspense fallback={<ModelLoadFallback />}>
                      <Environment preset="city" environmentIntensity={0.9} />
                      <PreviewModel url={glbPreview.loadUrl} />
                      <OrbitControls enableDamping makeDefault />
                    </Suspense>
                  </Canvas>
                </GlbErrorBoundary>
              ) : glbUrl ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-stone-500">
                  {glbPreview.loading ? (
                    <>
                      <div
                        className="h-9 w-9 animate-spin rounded-full border-2 border-stone-200 border-t-amber-800"
                        aria-hidden
                      />
                      <p>Fetching GLB through your dev server (Meshy CDN blocks direct browser access).</p>
                    </>
                  ) : (
                    <p>Preview could not be prepared. Check the message above or try again.</p>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-500">
                  {busy ? 'Meshy is generating — status above updates every few seconds.' : 'Generated GLB appears here'}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!glbUrl || saveBusy}
              onClick={() => void saveToLibrary()}
              className="mt-4 w-full rounded-xl bg-amber-900/90 px-4 py-3 text-sm font-medium text-amber-50 hover:bg-amber-900 disabled:opacity-40"
            >
              {saveBusy ? 'Saving to disk…' : 'Save to My Library'}
            </button>
            <p className="mt-2 text-[11px] text-stone-500">
              Saves a copy under <code className="rounded bg-stone-100 px-1">public/models/user/</code>{' '}
              via the dev server (needs a writable filesystem).
            </p>
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
