/* =====================================================
   MensajePage — Página pública del destinatario
   Se accede escaneando el QR de la Etiqueta Emotiva
   Mobile-first, emotiva, sin auth
   ===================================================== */
import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import {
  Gift, Heart, Star, Coffee, Package, Sparkles, Sun,
  TreePine, Music, Award, Smile, Home, Send, Wine,
  Flower, Cake, CheckCircle, MessageSquare, ArrowRight,
  QrCode, AlertCircle,
} from 'lucide-react';

const HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };
const ORANGE  = '#FF6835';

/* ── Icon map ── */
const ICON_MAP: Record<string, React.ElementType> = {
  gift: Gift, heart: Heart, star: Star, coffee: Coffee,
  package: Package, sparkles: Sparkles, sun: Sun,
  treepine: TreePine, music: Music, award: Award,
  smile: Smile, home: Home, send: Send, wine: Wine,
  flower: Flower, cake: Cake,
};

interface Etiqueta {
  token: string;
  remitente_nombre: string;
  destinatario_nombre: string;
  mensaje: string;
  icono: string;
  ocasion: string;
  estado: string;
  respuesta: string | null;
  respondida_at: string | null;
}

type Fase = 'loading' | 'error' | 'mensaje' | 'responder' | 'gracias';

export default function MensajePage() {
  const { token } = useParams<{ token: string }>();
  const [etiqueta, setEtiqueta] = useState<Etiqueta | null>(null);
  const [fase, setFase]         = useState<Fase>('loading');
  const [respuesta, setRespuesta] = useState('');
  const [nombre, setNombre]       = useState('');
  const [contacto, setContacto]   = useState('');
  const [enviando, setEnviando]   = useState(false);

  /* Load + auto-scan */
  useEffect(() => {
    if (!token) { setFase('error'); return; }

    const load = async () => {
      try {
        // Get etiqueta
        const r = await fetch(`${API}/etiquetas/token/${token}`, { headers: HEADERS });
        if (!r.ok) { setFase('error'); return; }
        const data = await r.json();
        setEtiqueta(data);

        // Ya respondida → mostrar agradecimiento
        if (data.estado === 'respondida') {
          setFase('gracias');
          return;
        }

        // Registrar escaneo
        await fetch(`${API}/etiquetas/token/${token}/scan`, { method: 'POST', headers: HEADERS });
        setFase('mensaje');
      } catch {
        setFase('error');
      }
    };

    load();
  }, [token]);

  const handleResponder = async () => {
    if (!respuesta.trim() || !token) return;
    setEnviando(true);
    try {
      await fetch(`${API}/etiquetas/token/${token}/responder`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ mensaje: respuesta, nombre, contacto }),
      });
      setFase('gracias');
    } catch {
      alert('Error al enviar. Intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const Icon = etiqueta ? (ICON_MAP[etiqueta.icono] || Gift) : Gift;

  /* ── Loading ── */
  if (fase === 'loading') {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', padding: '60px 20px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ margin: 0 }}>Abriendo tu mensaje...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </PageShell>
    );
  }

  /* ── Error ── */
  if (fase === 'error' || !etiqueta) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertCircle size={30} color="#fff" strokeWidth={1.5} />
          </div>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: '0 0 10px' }}>Mensaje no encontrado</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px', margin: 0 }}>
            Este enlace no existe o ya no está disponible.
          </p>
        </div>
      </PageShell>
    );
  }

  /* ── Mensaje principal ── */
  if (fase === 'mensaje') {
    return (
      <PageShell>
        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>

          {/* Icono animado */}
          <div style={{ width: '88px', height: '88px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', border: '2px solid rgba(255,255,255,0.3)' }}>
            <Icon size={42} color="#fff" strokeWidth={1.5} />
          </div>

          {/* Para */}
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', margin: '0 0 4px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            Para
          </p>
          <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: 900, margin: '0 0 28px', textAlign: 'center', lineHeight: 1.1 }}>
            {etiqueta.destinatario_nombre}
          </h1>

          {/* Card del mensaje */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.25)', padding: '28px 24px', width: '100%', maxWidth: '400px', marginBottom: '28px' }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Heart size={13} />
              <span>Mensaje de <strong style={{ color: '#fff' }}>{etiqueta.remitente_nombre}</strong></span>
            </div>
            <p style={{ color: '#fff', fontSize: '17px', lineHeight: '1.65', margin: 0, fontWeight: 400 }}>
              {etiqueta.mensaje}
            </p>
          </div>

          {/* Botón responder */}
          <button
            onClick={() => setFase('responder')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 32px', backgroundColor: '#fff', color: ORANGE, border: 'none', borderRadius: '50px', cursor: 'pointer', fontSize: '16px', fontWeight: 800, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', marginBottom: '16px', width: '100%', maxWidth: '320px', justifyContent: 'center' }}
          >
            <MessageSquare size={18} />
            Responder con un mensaje
            <ArrowRight size={18} />
          </button>

          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textAlign: 'center', margin: 0 }}>
            Tu respuesta llegará directamente a {etiqueta.remitente_nombre}
          </p>

          {/* Badge Charlie */}
          <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
            <QrCode size={12} />
            <span>Enviado con <strong>Charlie Marketplace</strong></span>
          </div>
        </div>
      </PageShell>
    );
  }

  /* ── Formulario de respuesta ── */
  if (fase === 'responder') {
    return (
      <PageShell>
        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '420px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <MessageSquare size={26} color="#fff" strokeWidth={1.5} />
            </div>
            <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: '0 0 8px' }}>Tu respuesta</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: 0 }}>
              {etiqueta.remitente_nombre} va a recibir tu mensaje
            </p>
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Tu mensaje *</label>
            <textarea
              value={respuesta}
              onChange={e => setRespuesta(e.target.value)}
              placeholder={`Gracias ${etiqueta.remitente_nombre}, llegó perfecto...`}
              rows={5}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1.5px solid rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '15px', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: '1.55', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Tu nombre (opcional)</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder={etiqueta.destinatario_nombre}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
              ¿Querés recibir novedades de Charlie? (opcional)
            </label>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 8px' }}>Tu celular o email — solo si vos querés</p>
            <input
              type="text"
              value={contacto}
              onChange={e => setContacto(e.target.value)}
              placeholder="+598 99 xxx xxx o tu@email.com"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={handleResponder}
            disabled={!respuesta.trim() || enviando}
            style={{ padding: '16px', backgroundColor: respuesta.trim() && !enviando ? '#fff' : 'rgba(255,255,255,0.2)', color: respuesta.trim() && !enviando ? ORANGE : 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '50px', cursor: respuesta.trim() && !enviando ? 'pointer' : 'default', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' }}
          >
            {enviando ? 'Enviando...' : <><Send size={16} /> Enviar respuesta</>}
          </button>

          <button onClick={() => setFase('mensaje')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>
            ← Volver al mensaje
          </button>
        </div>
      </PageShell>
    );
  }

  /* ── Gracias ── */
  return (
    <PageShell>
      <div style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', textAlign: 'center' }}>
        <div style={{ width: '88px', height: '88px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '2px solid rgba(255,255,255,0.35)' }}>
          <CheckCircle size={44} color="#fff" strokeWidth={1.5} />
        </div>
        <h1 style={{ color: '#fff', fontSize: '30px', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.1 }}>
          {etiqueta.estado === 'respondida' && !respuesta ? '¡Ya respondiste!' : '¡Gracias!'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', lineHeight: '1.6', margin: '0 0 40px', maxWidth: '320px' }}>
          {etiqueta.estado === 'respondida' && !respuesta
            ? 'Tu mensaje ya fue enviado. ¡Que disfrutes el regalo!'
            : `Tu respuesta llegó a ${etiqueta.remitente_nombre}. ¡Que disfrutes el regalo!`
          }
        </p>
        <div style={{ padding: '20px 28px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)', maxWidth: '320px', width: '100%' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '4px' }}>Enviado con</div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: '18px' }}>Charlie Marketplace</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>Cada envío cuenta una historia</div>
        </div>
      </div>
    </PageShell>
  );
}

/* ── Page Shell ── */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(145deg, #FF6835 0%, #e8501e 40%, #c73d0f 100%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
}



