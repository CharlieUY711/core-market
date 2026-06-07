import { supabase } from '../../utils/supabase/client';

export interface ProductoMarket {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_original?: number;
  departamento_id?: string;
  departamento_nombre?: string;
  imagen_principal: string;
  imagenes?: string[];
  videos?: string[];
  vendedor_id?: string;
  rating?: number;
  rating_count?: number;
  visitas?: number;
  estado?: 'activo' | 'inactivo' | 'vendido' | 'agotado';
  badge?: string;
  badge_color?: string;
  published_date?: string;
  created_at?: string;
  updated_at?: string;
  departamento?: {
    id: string;
    nombre: string;
    color: string;
  };
  vendedor?: {
    id: string;
    nombre: string;
    rating_promedio?: number;
    total_ratings?: number;
  };
}

export interface ProductoSecondHand {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_original?: number;
  departamento_id?: string;
  departamento_nombre?: string;
  imagen_principal: string;
  imagenes?: string[];
  videos?: string[];
  vendedor_id?: string;
  rating?: number;
  rating_count?: number;
  visitas?: number;
  estado?: 'activo' | 'inactivo' | 'vendido' | 'agotado';
  condicion?: string;
  published_date?: string;
  created_at?: string;
  updated_at?: string;
  departamento?: {
    id: string;
    nombre: string;
    color: string;
  };
  vendedor?: {
    id: string;
    nombre: string;
    rating_promedio?: number;
    total_ratings?: number;
  };
}

export interface ProductosFilters {
  departamento_id?: string;
  vendedor_id?: string;
  estado?: string;
  search?: string;
  limit?: number;
  offset?: number;
  order_by?: string;
  order_dir?: 'asc' | 'desc';
}

export async function fetchProductosMarket(filters?: ProductosFilters): Promise<ProductoMarket[]> {
  try {
    let query = supabase
      .from('productos_market')
      .select('*, departamento:departamentos(id, nombre, color)');
    
    if (filters?.departamento_id) {
      query = query.eq('departamento_id', filters.departamento_id);
    }
    if (filters?.vendedor_id) {
      query = query.eq('vendedor_id', filters.vendedor_id);
    }
    if (filters?.estado) {
      query = query.eq('estado', filters.estado);
    }
    if (filters?.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }
    
    const orderBy = filters?.order_by || 'created_at';
    const orderDir = filters?.order_dir || 'desc';
    query = query.order(orderBy, { ascending: orderDir === 'asc' });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching productos market:', error);
      throw new Error(error.message || 'Error cargando productos market');
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching productos market:', error);
    throw error;
  }
}

export async function fetchProductoMarketById(id: string): Promise<ProductoMarket | null> {
  try {
    const { data, error } = await supabase
      .from('productos_market')
      .select('*, departamento:departamentos(id, nombre, color)')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching producto market:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching producto market:', error);
    throw error;
  }
}

export async function createProductoMarket(producto: Partial<ProductoMarket>): Promise<ProductoMarket> {
  try {
    const { data, error } = await supabase
      .from('productos_market')
      .insert(producto)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating producto market:', error);
      throw new Error(error.message || 'Error creando producto market');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating producto market:', error);
    throw error;
  }
}

export async function updateProductoMarket(id: string, producto: Partial<ProductoMarket>): Promise<ProductoMarket> {
  try {
    const { data, error } = await supabase
      .from('productos_market')
      .update({
        ...producto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating producto market:', error);
      throw new Error(error.message || 'Error actualizando producto market');
    }
    
    return data;
  } catch (error) {
    console.error('Error updating producto market:', error);
    throw error;
  }
}

export async function deleteProductoMarket(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('productos_market')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting producto market:', error);
      throw new Error(error.message || 'Error eliminando producto market');
    }
  } catch (error) {
    console.error('Error deleting producto market:', error);
    throw error;
  }
}

export async function fetchProductosSecondHand(filters?: ProductosFilters): Promise<ProductoSecondHand[]> {
  try {
    let query = supabase
      .from('productos_secondhand')
      .select('*, departamento:departamentos(id, nombre, color)');
    
    if (filters?.departamento_id) {
      query = query.eq('departamento_id', filters.departamento_id);
    }
    if (filters?.vendedor_id) {
      query = query.eq('vendedor_id', filters.vendedor_id);
    }
    if (filters?.estado) {
      query = query.eq('estado', filters.estado);
    }
    if (filters?.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }
    
    const orderBy = filters?.order_by || 'created_at';
    const orderDir = filters?.order_dir || 'desc';
    query = query.order(orderBy, { ascending: orderDir === 'asc' });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching productos secondhand:', error);
      throw new Error(error.message || 'Error cargando productos secondhand');
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching productos secondhand:', error);
    throw error;
  }
}

export async function fetchProductoSecondHandById(id: string): Promise<ProductoSecondHand | null> {
  try {
    const { data, error } = await supabase
      .from('productos_secondhand')
      .select('*, departamento:departamentos(id, nombre, color)')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching producto secondhand:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching producto secondhand:', error);
    throw error;
  }
}

export async function createProductoSecondHand(producto: Partial<ProductoSecondHand>): Promise<ProductoSecondHand> {
  try {
    const { data, error } = await supabase
      .from('productos_secondhand')
      .insert(producto)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating producto secondhand:', error);
      throw new Error(error.message || 'Error creando producto secondhand');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating producto secondhand:', error);
    throw error;
  }
}

export async function updateProductoSecondHand(id: string, producto: Partial<ProductoSecondHand>): Promise<ProductoSecondHand> {
  try {
    const { data, error } = await supabase
      .from('productos_secondhand')
      .update({
        ...producto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating producto secondhand:', error);
      throw new Error(error.message || 'Error actualizando producto secondhand');
    }
    
    return data;
  } catch (error) {
    console.error('Error updating producto secondhand:', error);
    throw error;
  }
}

export async function deleteProductoSecondHand(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('productos_secondhand')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting producto secondhand:', error);
      throw new Error(error.message || 'Error eliminando producto secondhand');
    }
  } catch (error) {
    console.error('Error deleting producto secondhand:', error);
    throw error;
  }
}





