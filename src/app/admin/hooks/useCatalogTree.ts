import { useState, useEffect, useCallback } from "react";
import { catalogService } from "../services/catalogService";

export interface CatalogNode {
  id:         string;
  name:       string;
  slug:       string;
  type:       string;
  level:      number;
  position:   number;
  is_active:  boolean;
  image_url:  string | null;
  product_id: string | null;
  children:   CatalogNode[];
}

export function useCatalogTree() {
  const [tree,    setTree]    = useState<CatalogNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await catalogService.getTree();
    if (error) setError(error.message);
    else setTree(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, []);

  const createNode = async (parentId: string | null, name: string, type: string) => {
    const { error } = await catalogService.createNode(parentId, name, type);
    if (error) throw new Error(error.message);
    await refetch();
  };

  const updateNode = async (id: string, name: string) => {
    const { error } = await catalogService.updateNode(id, { p_name: name });
    if (error) throw new Error(error.message);
    await refetch();
  };

  const deleteNode = async (id: string) => {
    const { error } = await catalogService.deleteNode(id);
    if (error) throw new Error(error.message);
    await refetch();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await catalogService.updateNode(id, { p_is_active: !current });
    if (error) throw new Error(error.message);
    await refetch();
  };

  return { tree, loading, error, refetch, createNode, updateNode, deleteNode, toggleActive };
}




