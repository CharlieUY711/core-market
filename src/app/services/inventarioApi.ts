/* =====================================================
   Inventario API Service — Frontend ↔ Backend
   ===================================================== */
import { supabase } from '../../utils/supabase/client';

// ── Types ────────────────────────────────────────────────────────────
export interface ItemInventario {
  id: string;
  deposito_id: string;
  sku: string;
  nombre: string;
  categoria?: string;
  ubicacion?: string;
  cantidad: number;
  cantidad_minima: number;
  costo_unitario?: number;
  depositos?: { nombre: string };
  created_at?: string;
}

export interface ItemInventarioInput {
  deposito_id: string;
  sku: string;
  nombre: string;
  categoria?: string;
  ubicacion?: string;
  cantidad: number;
  cantidad_minima: number;
  costo_unitario?: number;
}

export interface MovimientoInventario {
  tipo: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  notas?: string;
}

// ── CRUD Inventario ──────────────────────────────────────────────────

export async function getInventario(filters?: { deposito_id?: string; search?: string }): Promise<{ data: ItemInventario[]; alertas_count: number }> {
  try {
    let query = supabase
      .from('inventario')
      .select('*, depositos(nombre)')
      .order('created_at', { ascending: false });
    
    if (filters?.deposito_id) {
      query = query.eq('deposito_id', filters.deposito_id);
    }
    
    if (filters?.search) {
      query = query.or(`sku.ilike.%${filters.search}%,nombre.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const items = (data || []) as ItemInventario[];
    
    // Calcular alertas: items donde cantidad <= cantidad_minima
    const alertas_count = items.filter(item => item.cantidad <= item.cantidad_minima).length;
    
    return { data: items, alertas_count };
  } catch (error) {
    console.error('Error obteniendo inventario:', error);
    throw error;
  }
}

export async function createItem(data: ItemInventarioInput): Promise<ItemInventario> {
  try {
    const { data: newData, error } = await supabase
      .from('inventario')
      .insert(data)
      .select('*, depositos(nombre)')
      .single();
    
    if (error) throw error;
    if (!newData) throw new Error('Error creando item de inventario');
    return newData as ItemInventario;
  } catch (error) {
    console.error('Error creando item de inventario:', error);
    throw error;
  }
}

export async function updateItem(id: string, data: Partial<ItemInventarioInput>): Promise<ItemInventario> {
  try {
    const { data: updatedData, error } = await supabase
      .from('inventario')
      .update(data)
      .eq('id', id)
      .select('*, depositos(nombre)')
      .single();
    
    if (error) throw error;
    if (!updatedData) throw new Error('Item de inventario no encontrado');
    return updatedData as ItemInventario;
  } catch (error) {
    console.error('Error actualizando item de inventario:', error);
    throw error;
  }
}

export async function deleteItem(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('inventario')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error eliminando item de inventario:', error);
    throw error;
  }
}

export async function registrarMovimiento(
  item_id: string,
  mov: MovimientoInventario
): Promise<{ cantidad_anterior: number; cantidad_nueva: number }> {
  try {
    // Leer el item actual
    const { data: item, error: fetchError } = await supabase
      .from('inventario')
      .select('cantidad')
      .eq('id', item_id)
      .single();
    
    if (fetchError) throw fetchError;
    if (!item) throw new Error('Item de inventario no encontrado');
    
    const cantidad_anterior = item.cantidad;
    let cantidad_nueva: number;
    
    // Calcular nueva cantidad según tipo de movimiento
    switch (mov.tipo) {
      case 'entrada':
        cantidad_nueva = cantidad_anterior + mov.cantidad;
        break;
      case 'salida':
        cantidad_nueva = cantidad_anterior - mov.cantidad;
        break;
      case 'ajuste':
        cantidad_nueva = mov.cantidad;
        break;
      default:
        throw new Error('Tipo de movimiento inválido');
    }
    
    // Actualizar cantidad
    const { error: updateError } = await supabase
      .from('inventario')
      .update({ cantidad: cantidad_nueva })
      .eq('id', item_id);
    
    if (updateError) throw updateError;
    
    return { cantidad_anterior, cantidad_nueva };
  } catch (error) {
    console.error('Error registrando movimiento de inventario:', error);
    throw error;
  }
}




