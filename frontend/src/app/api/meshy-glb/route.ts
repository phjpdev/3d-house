import { NextRequest, NextResponse } from 'next/server'
import { isMeshySignedAssetUrl } from '@/lib/meshyAssets'

const MAX_SOURCE_URL_LENGTH = 16_384

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

  if (!sourceUrl || sourceUrl.length > MAX_SOURCE_URL_LENGTH) {
    return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
  }

  if (!isMeshySignedAssetUrl(sourceUrl)) {
    return NextResponse.json({ error: 'URL is not an allowed Meshy asset URL' }, { status: 403 })
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

  const buf = await upstream.arrayBuffer()
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'model/gltf-binary',
      'Cache-Control': 'private, max-age=120',
    },
  })
}
