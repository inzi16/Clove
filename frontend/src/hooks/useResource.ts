import { useCallback, useEffect, useState } from 'react'
import type { ApiResult } from '../types'

export function useResource<T>(loader: () => Promise<ApiResult<T>>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'live' | 'demo'>('live')
  const [error, setError] = useState<string | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await loader()
      setData(result.data)
      setSource(result.source)
      setError(result.error)
    } catch (error) {
      setData(null)
      setSource('live')
      setError(error instanceof Error ? error.message : 'This data could not be loaded.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { void load() }, [load])
  return { data, setData, loading, source, error, reload: load }
}
