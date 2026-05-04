import { access } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { safeModelBasename } from '@/lib/safeModelBasename'

const MODELS_DIR = join(process.cwd(), 'public', 'models')

/** Resolve `public/models` basename from a `/models/...` path or full URL; always JSON 200. */
function basenameFromModelsUrl(raw: string): string | null {
  let pathname: string
  try {
    const trimmed = raw.trim()
    if (!trimmed) return null
    pathname = /^https?:\/\//i.test(trimmed)
      ? new URL(trimmed).pathname
      : trimmed.split('?')[0].split('#')[0]
  } catch {
    return null
  }

  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  const m = normalized.match(/^\/models\/([^/]+)$/i)
  if (!m) return null

  let leaf = m[1]
  try {
    leaf = decodeURIComponent(leaf)
  } catch {
    return null
  }
  return safeModelBasename(leaf)
}

export async function GET(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get('url') ?? ''
  const filename = basenameFromModelsUrl(raw)
  if (!filename) {
    return NextResponse.json({ reachable: false })
  }
  try {
    await access(join(MODELS_DIR, filename))
    return NextResponse.json({ reachable: true })
  } catch {
    return NextResponse.json({ reachable: false })
  }
}
