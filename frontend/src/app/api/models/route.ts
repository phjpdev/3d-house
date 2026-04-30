import { mkdir, readdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

/** All uploaded / saved GLBs live next to shipped assets under `public/models`. */
const MODELS_DIR = join(process.cwd(), 'public', 'models')
const MAX_MODEL_BYTES = 52 * 1024 * 1024

function safeModelBasename(name: string): string | null {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? ''
  if (!base || base.includes('..') || !/\.(glb|gltf)$/i.test(base)) return null
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null
  return base
}

function displayName(filename: string): string {
  const base = filename.replace(/\.(glb|gltf)$/i, '').trim()
  return base.replace(/[-_]+/g, ' ') || filename
}

/**
 * Lists `.glb` / `.gltf` files in `public/models` (top-level only) for the Edit Home sidebar.
 */
export async function GET() {
  let filenames: string[]
  try {
    filenames = await readdir(MODELS_DIR, { withFileTypes: false })
  } catch {
    return NextResponse.json({ models: [] as { filename: string; url: string; name: string }[] })
  }

  const models = filenames
    .filter((n) => /\.(glb|gltf)$/i.test(n))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((filename) => ({
      filename,
      url: `/models/${encodeURIComponent(filename)}`,
      name: displayName(filename),
    }))

  return NextResponse.json({ models })
}

function buildSafeUploadFilename(original: string): string {
  const base = original.replace(/\\/g, '/').split('/').pop() ?? 'model.glb'
  const m = base.match(/^(.+)\.(glb|gltf)$/i)
  if (!m) return `model-${randomUUID().slice(0, 8)}.glb`
  const ext = `.${m[2].toLowerCase()}`
  let stem = m[1]
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56)
  if (!stem) stem = 'model'
  return `${stem}${ext}`
}

async function uniqueFilenameInModelsDir(filename: string): Promise<string> {
  let names: string[]
  try {
    names = await readdir(MODELS_DIR)
  } catch {
    names = []
  }
  const taken = new Set(names)
  if (!taken.has(filename)) return filename
  const ext = filename.match(/\.(glb|gltf)$/i)?.[0] ?? '.glb'
  const stem = filename.replace(/\.(glb|gltf)$/i, '')
  return `${stem}-${randomUUID().slice(0, 8)}${ext.toLowerCase()}`
}

/** Upload one `.glb` / `.gltf` into `public/models`. */
export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.byteLength === 0 || buf.byteLength > MAX_MODEL_BYTES) {
    return NextResponse.json({ error: 'File is empty or too large' }, { status: 413 })
  }

  const origName = typeof file.name === 'string' ? file.name : 'model.glb'
  const candidate = buildSafeUploadFilename(origName)
  const filename = await uniqueFilenameInModelsDir(candidate)
  if (!safeModelBasename(filename)) {
    return NextResponse.json({ error: 'Could not produce a safe filename' }, { status: 400 })
  }

  const absolutePath = join(MODELS_DIR, filename)
  try {
    await mkdir(MODELS_DIR, { recursive: true })
    await writeFile(absolutePath, buf)
  } catch (e) {
    console.error('models write failed', e)
    return NextResponse.json(
      {
        error:
          'Could not save under public/models (filesystem may be read-only in this deploy). Run locally to persist uploads.',
      },
      { status: 507 },
    )
  }

  const publicUrl = `/models/${encodeURIComponent(filename)}`
  return NextResponse.json({
    ok: true as const,
    filename,
    url: publicUrl,
    name: displayName(filename),
  })
}

/** Deletes one `.glb` / `.gltf` from `public/models`. */
export async function DELETE(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get('filename')
  const filename = raw ? safeModelBasename(raw) : null
  if (!filename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const absolutePath = join(MODELS_DIR, filename)
  try {
    await unlink(absolutePath)
  } catch (e: unknown) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('models unlink failed', e)
    return NextResponse.json({ error: 'Could not delete file' }, { status: 500 })
  }

  return NextResponse.json({ ok: true as const })
}
