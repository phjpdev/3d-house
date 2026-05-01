import { useEffect, useState } from 'react'
import {
  checkModelUrlReachable,
  shouldSkipModelReachabilityCheck,
} from '@/lib/modelUrlReachable'

export type ModelReachability = 'checking' | 'reachable' | 'missing'

export function useModelUrlReachable(url: string): ModelReachability {
  const [state, setState] = useState<ModelReachability>(() => {
    if (shouldSkipModelReachabilityCheck(url)) return 'reachable'
    return 'checking'
  })

  useEffect(() => {
    if (shouldSkipModelReachabilityCheck(url)) {
      setState('reachable')
      return
    }
    let cancelled = false
    setState('checking')
    void checkModelUrlReachable(url).then((ok) => {
      if (!cancelled) setState(ok ? 'reachable' : 'missing')
    })
    return () => {
      cancelled = true
    }
  }, [url])

  return state
}
