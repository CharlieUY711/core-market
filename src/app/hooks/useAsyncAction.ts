import { useState, useCallback } from "react";

interface Options {
  retries?:  number;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?:   (err: Error) => void;
}

export function useAsyncAction<T = any>(
  fn: (...args: any[]) => Promise<T>,
  opts: Options = {}
) {
  const { retries = 0, retryDelay = 1000, onSuccess, onError } = opts;
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [data,    setData]    = useState<T | null>(null);

  const execute = useCallback(async (...args: any[]) => {
    setLoading(true);
    setError(null);
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const result = await fn(...args);
        setData(result);
        onSuccess?.(result);
        setLoading(false);
        return result;
      } catch (err: any) {
        attempt++;
        if (attempt > retries) {
          const msg = err?.message || "Error inesperado";
          setError(msg);
          onError?.(err);
          setLoading(false);
          return null;
        }
        await new Promise(r => setTimeout(r, retryDelay * attempt));
      }
    }
  }, [fn, retries, retryDelay, onSuccess, onError]);

  const reset = useCallback(() => { setError(null); setData(null); }, []);

  return { execute, loading, error, data, reset };
}




