import { useState, useEffect, useCallback } from "react";
import { catalogService } from "../services/catalogService";

export function useDepartments() {
  const [data,    setData]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await catalogService.getDepartments();
    if (error) setError(error.message); else setData(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, []);
  return { data, loading, error, refetch };
}

export function useCategories() {
  const [data,    setData]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await catalogService.getCategories();
    if (error) setError(error.message); else setData(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, []);
  return { data, loading, error, refetch };
}

export function useSubcategories() {
  const [data,    setData]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await catalogService.getSubcategories();
    if (error) setError(error.message); else setData(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, []);
  return { data, loading, error, refetch };
}




