/* =====================================================
   Entregas API Service — Frontend ↔ Backend
   ===================================================== */
import { supabase } from '../../utils/supabase/client';

// ── Types ────────────────────────────────────────────────────────────
export interface Entrega {
  id: string;
  envio_id: string;
  estado: 'entregado' | 'no_entregado' | 'parcial' | 'devuelto';
  fecha_entrega: string;
  firmado_por?: string;
  foto_url?: string;
  notas?: string;
  motivo_no_entrega?: string;
  envios?: { numero: string; destinatario: string; destino: string };
  created_at?: string;
}

export interface EntregaInput {
  envio_id: string;
  estado: 'entregado' | 'no_entregado' | 'parcial' | 'devuelto';
  fecha_entrega: string;
  firmado_por?: string;
  foto_url?: string;
  notas?: string;
  motivo_no_entrega?: string;
}

// ── CRUD Entregas ────────────────────────────────────────────────────

export async function getEntregas(filters?: { estado?: string }): Promise<Entrega[]> {
  try {
    let query = supabase
      .from('entregas')
      .select('*, envios(numero, destinatario, destino)')
      .order('fecha_entrega', { ascending: false });
    
    if (filters?.estado) {
      query = query.eq('estado', filters.estado);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return (data || []) as Entrega[];
  } catch (error) {
    console.error('Error obteniendo entregas:', error);
    throw error;
  }
}

export async function getEntrega(id: string): Promise<Entrega> {
  try {
    const { data, error } = await supabase
      .from('entregas')
      .select('*, envios(numero, destinatario, destino)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Entrega no encontrada');
    return data as Entrega;
  } catch (error) {
    console.error('Error obteniendo entrega:', error);
    throw error;
  }
}

export async function createEntrega(data: EntregaInput): Promise<Entrega> {
  try {
    const { data: newData, error } = await supabase
      .from('entregas')
      .insert(data)
      .select('*, envios(numero, destinatario, destino)')
      .single();
    
    if (error) throw error;
    if (!newData) throw new Error('Error creando entrega');
    return newData as Entrega;
  } catch (error) {
    console.error('Error creando entrega:', error);
    throw error;
  }
}

export async function updateEntrega(id: string, data: Partial<EntregaInput>): Promise<Entrega> {
  try {
    const { data: updatedData, error } = await supabase
      .from('entregas')
      .update(data)
      .eq('id', id)
      .select('*, envios(numero, destinatario, destino)')
      .single();
    
    if (error) throw error;
    if (!updatedData) throw new Error('Entrega no encontrada');
    return updatedData as Entrega;
  } catch (error) {
    console.error('Error actualizando entrega:', error);
    throw error;
  }
}




