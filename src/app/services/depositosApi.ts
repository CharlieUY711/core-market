/* =====================================================
   Depósitos API Service — Frontend ↔ Backend
   ===================================================== */
import { supabase } from '../../utils/supabase/client';

// ── Types ────────────────────────────────────────────────────────────
export interface Deposito {
  id: string;
  nombre: string;
  direccion: string;
  ciudad?: string;
  tipo: 'propio' | 'tercero' | 'cross_docking';
  responsable?: string;
  telefono?: string;
  capacidad_m2?: number;
  activo: boolean;
  inventario?: any[];
  created_at?: string;
}

export interface DepositoInput {
  nombre: string;
  direccion: string;
  ciudad?: string;
  tipo: 'propio' | 'tercero' | 'cross_docking';
  responsable?: string;
  telefono?: string;
  capacidad_m2?: number;
  activo?: boolean;
  inventario?: any[];
}

// ── CRUD Depósitos ────────────────────────────────────────────────────

export async function getDepositos(): Promise<Deposito[]> {
  try {
    const { data, error } = await supabase
      .from('depositos')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo depósitos:', error);
    throw error;
  }
}

export async function getDeposito(id: string): Promise<Deposito> {
  try {
    const { data, error } = await supabase
      .from('depositos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Depósito no encontrado');
    return data;
  } catch (error) {
    console.error('Error obteniendo depósito:', error);
    throw error;
  }
}

export async function createDeposito(data: DepositoInput): Promise<Deposito> {
  try {
    const { data: newData, error } = await supabase
      .from('depositos')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    if (!newData) throw new Error('Error creando depósito');
    return newData;
  } catch (error) {
    console.error('Error creando depósito:', error);
    throw error;
  }
}

export async function updateDeposito(id: string, data: Partial<DepositoInput>): Promise<Deposito> {
  try {
    const { data: updatedData, error } = await supabase
      .from('depositos')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!updatedData) throw new Error('Depósito no encontrado');
    return updatedData;
  } catch (error) {
    console.error('Error actualizando depósito:', error);
    throw error;
  }
}

export async function deleteDeposito(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('depositos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error eliminando depósito:', error);
    throw error;
  }
}




