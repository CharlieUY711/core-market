import { useState } from "react"

export function useAsyncAction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (fn) => {
    setLoading(true)
    setError(null)

    try {
      return await fn()
    } catch {
      setError('Error')
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, run }
}




