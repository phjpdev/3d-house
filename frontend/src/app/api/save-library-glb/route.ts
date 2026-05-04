import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { isMeshySignedAssetUrl } from '@/lib/meshyAssets'
import { MAX_LIBRARY_MODEL_BYTES } from '@/lib/uploadLimits'

const MAX_SOURCE_URL_LENGTH = 16_384

function slugFromHint(nameHint: string | undefined): string {
  const raw = (nameHint ?? 'model').trim().toLowerCase()
  const slug = raw
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug.length > 0 ? slug : 'model'
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sourceUrl =
    typeof body === 'object' &&
    body !== null &&
    'sourceUrl' in body &&
    typeof (body as { sourceUrl: unknown }).sourceUrl === 'string'
      ? (body as { sourceUrl: string }).sourceUrl
      : null

  const nameHint =
    typeof body === 'object' &&
    body !== null &&
    'nameHint' in body &&
    typeof (body as { nameHint: unknown }).nameHint === 'string'
      ? (body as { nameHint: string }).nameHint
      : undefined

  if (!sourceUrl || sourceUrl.length > MAX_SOURCE_URL_LENGTH) {
    return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
  }

  if (!isMeshySignedAssetUrl(sourceUrl)) {
    return NextResponse.json(
      { error: 'Only Meshy asset URLs can be imported this way' },
      { status: 403 },
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(sourceUrl, {
      headers: { Accept: 'model/gltf-binary,application/octet-stream,*/*' },
      redirect: 'follow',
    })
  } catch {
    return NextResponse.json({ error: 'Failed to reach Meshy' }, { status: 502 })
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Meshy returned ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 },
    )
  }

  const buf = Buffer.from(await upstream.arrayBuffer())
  if (buf.byteLength > MAX_LIBRARY_MODEL_BYTES) {
    return NextResponse.json({ error: 'Model file is too large' }, { status: 413 })
  }

  const slug = slugFromHint(nameHint)
  const id = randomUUID().slice(0, 8)
  const filename = `${slug}-${id}.glb`
  const modelsDir = join(process.cwd(), 'public', 'models')
  const absolutePath = join(modelsDir, filename)

  try {
    await mkdir(modelsDir, { recursive: true })
    await writeFile(absolutePath, buf)
  } catch (e) {
    console.error('save-library-glb write failed', e)
    return NextResponse.json(
      {
        error:
          'Could not write file under public/models (filesystem may be read-only in this deploy). Run locally for saving to disk.',
      },
      { status: 507 },
    )
  }

  const publicUrl = `/models/${filename}`
  return NextResponse.json({ ok: true as const, publicUrl, filename })
}
