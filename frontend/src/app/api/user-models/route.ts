import { readdir, unlink } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

const USER_MODELS_DIR = join(process.cwd(), 'public', 'models', 'user')

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
 * Lists `.glb` / `.gltf` files in `public/models/user` for the Edit Home sidebar.
 */
export async function GET() {
  let filenames: string[]
  try {
    filenames = await readdir(USER_MODELS_DIR, { withFileTypes: false })
  } catch {
    return NextResponse.json({ models: [] as { filename: string; url: string; name: string }[] })
  }

  const models = filenames
    .filter((n) => /\.(glb|gltf)$/i.test(n))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((filename) => ({
      filename,
      url: `/models/user/${encodeURIComponent(filename)}`,
      name: displayName(filename),
    }))

  return NextResponse.json({ models })
}

/** Deletes one `.glb` / `.gltf` from `public/models/user`. */
export async function DELETE(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get('filename')
  const filename = raw ? safeModelBasename(raw) : null
  if (!filename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const absolutePath = join(USER_MODELS_DIR, filename)
  try {
    await unlink(absolutePath)
  } catch (e: unknown) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('user-models unlink failed', e)
    return NextResponse.json({ error: 'Could not delete file' }, { status: 500 })
  }

  return NextResponse.json({ ok: true as const })
}
