/* =====================================================
   Órdenes API Service — Frontend ↔ Backend
   Charlie Marketplace Builder v1.5
   ===================================================== */
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../../utils/supabase/client';

const BASE = `https://${projectId}.supabase.co/functions/v1/api/ordenes`;
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
};

// ── Types ────────────────────────────────────────────────────────────
export interface OrdenItem {
  id: string;
  orden_id: string;
  producto_id: string;
  producto_tipo: 'market' | 'secondhand';
  nombre_producto: string;
  imagen_producto?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at?: string;
}

export interface Orden {
  id: string;
  numero_orden: string;
  usuario_id?: string;
  sesion_id?: string;
  estado: 'pendiente' | 'confirmada' | 'en_proceso' | 'enviada' | 'entregada' | 'cancelada';
  subtotal: number;
  impuestos: number;
  envio: number;
  total: number;
  metodo_pago?: string;
  estado_pago: 'pendiente' | 'pagado' | 'reembolsado' | 'fallido';
  nombre_completo: string;
  email: string;
  telefono?: string;
  direccion: string;
  ciudad: string;
  codigo_postal?: string;
  pais: string;
  notas?: string;
  created_at?: string;
  updated_at?: string;
  items?: OrdenItem[];
}

export interface CrearOrdenData {
  nombre_completo: string;
  email: string;
  telefono?: string;
  direccion: string;
  ciudad: string;
  codigo_postal?: string;
  pais?: string;
  notas?: string;
  metodo_pago?: string;
  envio?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = { ...HEADERS };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  // Nota: X-Session-Id se envía como query param temporalmente hasta que se redepliegue con CORS actualizado
  // headers['X-Session-Id'] = sesionId; // Comentado temporalmente por CORS
  
  return headers;
}

function getSessionId(): string {
  let sesionId = localStorage.getItem('sesion_id');
  if (!sesionId) {
    sesionId = crypto.randomUUID();
    localStorage.setItem('sesion_id', sesionId);
  }
  return sesionId;
}

// ── Órdenes Operations ────────────────────────────────────────────────

export async function getOrdenes(): Promise<Orden[]> {
  try {
    const headers = await getAuthHeaders();
    const sesionId = getSessionId();
    const res = await fetch(`${BASE}?sesion_id=${encodeURIComponent(sesionId)}`, { headers });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data || [];
  } catch (error) {
    console.error('Error obteniendo órdenes:', error);
    throw error;
  }
}

export async function getOrdenById(ordenId: string): Promise<Orden> {
  try {
    const headers = await getAuthHeaders();
    const sesionId = getSessionId();
    const res = await fetch(`${BASE}/${ordenId}?sesion_id=${encodeURIComponent(sesionId)}`, { headers });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  } catch (error) {
    console.error('Error obteniendo orden:', error);
    throw error;
  }
}

export async function crearOrden(data: CrearOrdenData): Promise<Orden> {
  try {
    const headers = await getAuthHeaders();
    const sesionId = getSessionId();
    const res = await fetch(`${BASE}?sesion_id=${encodeURIComponent(sesionId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  } catch (error) {
    console.error('Error creando orden:', error);
    throw error;
  }
}





