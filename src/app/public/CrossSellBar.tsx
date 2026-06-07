/* =====================================================
   CORE Storefront — CoreStorefront.tsx
   CORE Marketplace Builder v1.5
   Frontstore principal: Market + Segunda Mano
   ===================================================== */
import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from '../../utils/supabase/client';
import { useProductos } from '../hooks/useProductos';
import { agregarAlCarrito } from '../services/carritoApi';
import '../../styles/core-storefront.css';


// ── Types ─────────────────────────────────────────────────────────────────────
interface MktProduct {
  id: number; img: string; d: string; n: string;
  p: string; o: string | null; b: string | null; bt: string;
  desc: string; r: number; rv: number; q: string; vids?: string[]; // Array de videos (máximo 5)
  publishedDate?: string;
  sellerName?: string; // Nombre del vendedor
}
interface ShProduct {
  id: number; img: string; d: string; n: string;
  p: string; og: string; c: number;
  desc: string; r: number; rv: number; q: string; vids?: string[]; // Array de videos (máximo 5)
  publishedDate?: string;
}
interface CartItem { id: number; img: string; n: string; p: string; pNum: number; m: 'mkt' | 'sh'; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const parsePrice = (p: string) => parseInt(p.replace(/[\$\.]/g, ''), 10);
const fmtNum = (n: number) => '$ ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const separatePrice = (price: string) => {
  if (!price) return price;
  // Eliminar puntos de los miles
  let cleanedPrice = price.replace(/\./g, '');
  // Si el precio contiene $, separarlo del valor con un espacio
  const dollarIndex = cleanedPrice.indexOf('$');
  if (dollarIndex !== -1) {
    const before = cleanedPrice.substring(0, dollarIndex).trim();
    const after = cleanedPrice.substring(dollarIndex + 1).trim();
    return <>{before ? before + ' ' : ''}$ {after}</>;
  }
  return cleanedPrice;
};

// ── Department Colors (Pastel) ──────────────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  'Electro': '#DDA0DD',      // Lila pastel
  'Moda': '#FFB6C1',         // Rosa pastel
  'Hogar': '#FFDAB9',        // Melocotón
  'Almacén': '#FFF8DC',      // Amarillo pastel
  'Mascotas': '#FA8072',     // Salmón
  'Motos': '#AFEEEE',        // Turquesa
  'Limpieza': '#FFE4E1',     // Melocotón claro
  'Salud': '#B0E0E6',        // Azul claro
  'Deporte': '#D8BFD8',      // Morado pastel
  'Celulares': '#F5DEB3',    // Beige
  'Ferretería': '#F0FFF0',   // Menta
  'Librería': '#FFFDD0',     // Crema
  'Bebés': '#E0B0FF',        // Malva
  'Gaming': '#E6E6FA',       // Lavanda
  'Jardín': '#FF7F50',       // Coral
  'Autos': '#DDA0DD',        // Lila pastel (repetido si necesario)
  'Belleza': '#FFB6C1',      // Rosa pastel (repetido si necesario)
  'Delivery': '#FFDAB9',     // Melocotón (repetido si necesario)
};


const COND = ['','Regular','Buen estado','Buen estado','Muy bueno','Excelente'];
const DEPTS = [
  'Electro','Moda','Hogar','Almacén','Mascotas','Motos',
  'Limpieza','Salud','Deporte','Celulares','Ferretería','Librería',
  'Bebés','Gaming','Jardín','Autos','Belleza','Delivery',
];

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconHome   = () => <svg className="core-nico" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const IconGrid   = () => <svg className="core-nico" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const IconShield = () => <svg className="core-nico" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconSearch = () => <svg className="core-nico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconUser   = () => <svg className="core-nico" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconBag    = () => <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const IconSrchSm = () => <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconCart   = ({ size = 11 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
const IconCartFilled = ({ size = 24 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
const IconCartWithNumber = ({ count }: { count: number }) => {
  const fontSize = Math.min(10 + count * 0.5, 14); // Tamaño de fuente que aumenta con la cantidad, máximo 14px
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'relative' }}>
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      {count > 0 && (
        <text 
          x="12" 
          y="13.5" 
          fontSize={fontSize} 
          fill="currentColor" 
          fontWeight="normal"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ 
            fontFamily: 'Arial, sans-serif', 
            fontWeight: 'normal', 
            fontStyle: 'normal',
            pointerEvents: 'none'
          }}
        >
          {count}
        </text>
      )}
    </svg>
  );
};
const IconBell   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconPlay   = () => (
  <svg viewBox="0 0 12 12" width="10" height="10" fill="#222" stroke="none">
    <path d="M2.5 1.5 L10 6 L2.5 10.5 Z" />
  </svg>
);
// Iconos para controles de video - aceptan color como prop
const IconPlayTriangle = ({ filled = false, color = "#fff" }: { filled?: boolean; color?: string }) => (
  <svg viewBox="0 0 12 12" width="9.6" height="9.6" fill={filled ? color : "none"} stroke={color} strokeWidth={filled ? "0" : "1.5"} strokeLinejoin="round">
    <path d="M2.5 1.5 L10 6 L2.5 10.5 Z" />
  </svg>
);
const IconVolume = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);
const IconRewind = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 19 2 12 11 5 11 19"/>
    <polygon points="22 19 13 12 22 5 22 19"/>
  </svg>
);
const IconPause = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill={color} stroke="none">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>
);
const IconForward = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 19 22 12 13 5 13 19"/>
    <polygon points="2 19 11 12 2 5 2 19"/>
  </svg>
);
const IconBack = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);


async function trackEvent(eventType: string, metadata: Record<string, unknown> = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.VITE_API_URL}/track-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ event_type: eventType, metadata }),
    });
  } catch (_) {}
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CrossSellBar({ isSH, mp, sh }: { isSH: boolean; mp: MktProduct[]; sh: ShProduct[] }) {
  const items  = isSH ? mp : sh;
  const label  = isSH ? '♻️ También en 2da Mano' : '🛍️ También en Market';
  return (
    <div className="core-cs-sticky">
      <span className="core-cs-lbl">{label}</span>
      <div className="core-cs-scroller">
        {items.map(p => (
          <div key={p.id} className="core-cs-thumb">
            <img src={p.img} alt={p.n} />
            <div className="core-cs-thumb-p">{p.p}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
// ── Login Modal Component ─────────────────────────────────────────────────────

export { CrossSellBar };


