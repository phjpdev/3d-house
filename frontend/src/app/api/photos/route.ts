import { mkdir, readdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const PHOTOS_DIR = join(process.cwd(), 'public', 'photos')

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

const MAX_PHOTO_BYTES = 15 * 1024 * 1024

function displayName(filename: string): string {
  const base = filename.replace(IMAGE_EXT, '').trim()
  return base.replace(/[-_]+/g, ' ') || filename
}

function safeBasename(name: string): string | null {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? ''
  if (!base || base.includes('..') || !IMAGE_EXT.test(base)) return null
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null
  return base
}

/** Lists image files in `public/photos` for the Edit Home wall-art sidebar. */
export async function GET() {
  let filenames: string[]
  try {
    filenames = await readdir(PHOTOS_DIR, { withFileTypes: false })
  } catch {
    return NextResponse.json({ photos: [] as { filename: string; url: string; name: string }[] })
  }

  const photos = filenames
    .filter((n) => IMAGE_EXT.test(n))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((filename) => ({
      filename,
      url: `/photos/${encodeURIComponent(filename)}`,
      name: displayName(filename),
    }))

  return NextResponse.json({ photos })
}

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

  const mime = file.type || ''
  if (mime && !ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.byteLength === 0 || buf.byteLength > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: 'Image is empty or too large' }, { status: 413 })
  }

  const origName = typeof file.name === 'string' ? file.name : 'upload'
  const extMatch = origName.match(/\.(png|jpe?g|webp|gif)$/i)
  const ext = (extMatch?.[1] ?? 'png').toLowerCase().replace('jpeg', 'jpg')
  const filename = `${randomUUID()}.${ext === 'jpeg' ? 'jpg' : ext}`
  const absolutePath = join(PHOTOS_DIR, filename)

  try {
    await mkdir(PHOTOS_DIR, { recursive: true })
    await writeFile(absolutePath, buf)
  } catch (e) {
    console.error('photos write failed', e)
    return NextResponse.json(
      {
        error:
          'Could not save under public/photos (filesystem may be read-only in this deploy). Run locally to persist uploads.',
      },
      { status: 507 },
    )
  }

  const publicUrl = `/photos/${filename}`
  return NextResponse.json({
    ok: true as const,
    filename,
    url: publicUrl,
    name: displayName(filename),
  })
}

export async function DELETE(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get('filename')
  const filename = raw ? safeBasename(raw) : null
  if (!filename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const absolutePath = join(PHOTOS_DIR, filename)
  try {
    await unlink(absolutePath)
  } catch (e: unknown) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('photos unlink failed', e)
    return NextResponse.json({ error: 'Could not delete file' }, { status: 500 })
  }

  return NextResponse.json({ ok: true as const })
}
