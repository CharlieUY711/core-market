import { useEffect, useRef, useState, createContext, useContext } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router";
import { supabase } from "../../../utils/supabase/client";
import { useUserRole } from "../hooks/useUserRole";

interface ShopCtx {
  isSH:boolean; setIsSH:(v:boolean)=>void;
  topStats:{label:string;value:number|string;color:string}[];
  setTopStats:(s:{label:string;value:number|string;color:string}[])=>void;
}
export const ShopContext = createContext<ShopCtx>({isSH:false,
  setIsSH:()=>{},
  topStats:[],
  setTopStats:()=>{}});
export const useShop = () => useContext(ShopContext);


const SIDEBAR_BG  = "#0F3460";
const ACCENT      = "#FF7A00";

function UserAvatar({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`avatar_${user?.id}`);
    if (saved) setAvatar(saved);
  }, [user]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatar(dataUrl);
      localStorage.setItem(`avatar_${user?.id}`, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding:"1rem 1.5rem",
  borderBottom:"1px solid rgba(255,255,255,0.08)",
  display:"flex",
  alignItems:"center",
  gap:"0.75rem" }}>
      {/* Círculo avatar */}
      <div style={{ position:"relative",
  flexShrink:0 }}>
        <div onClick={() => inputRef.current?.click()}
          style={{ width:"44px",
  height:"44px",
  borderRadius:"50%",
  cursor:"pointer",
  overflow:"hidden",
  border:`2px solid ${isAdmin ? "#FF7A00" : "#6BB87A"}`,
  background:"rgba(255,255,255,0.1)",
  display:"flex",
  alignItems:"center",
  justifyContent:"center" }}>
          {avatar
            ? <img src={avatar} alt="avatar" style={{ width:"100%",
  height:"100%",
  objectFit:"cover" }} />
            : <span style={{ fontSize:"1.25rem" }}>{isAdmin ? "👑" : "👤"}</span>
          }
        </div>
        {/* Botón editar */}
        <div onClick={() => inputRef.current?.click()}
          style={{ position:"absolute",
  bottom:"-2px",
  right:"-2px",
  width:"18px",
  height:"18px",
  borderRadius:"50%",
  background:"#FF7A00",
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  cursor:"pointer",
  fontSize:"0.6rem",
  border:"2px solid #0A2540" }}>
          ✏️
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
      {/* Info */}
      <div style={{ minWidth:0 }}>
        <div style={{ color:"rgba(255,255,255,0.9)",
  fontSize:"0.75rem",
  fontWeight:600,
  overflow:"hidden",
  textOverflow:"ellipsis",
  whiteSpace:"nowrap",
  maxWidth:"140px" }}>
          {user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario"}
        </div>
        <div style={{ color: isAdmin ? "#FF7A00" : "#6BB87A",
  fontSize:"0.68rem",
  fontWeight:700,
  marginTop:"2px" }}>
          {isAdmin ? "Administrador" : "Usuario"}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const navigate  = useNavigate();
  const [isSH, setIsSH] = useState(false);
  const [topStats, setTopStats] = useState<{label:string;value:number|string;color:string}[]>([]);
  const location  = useLocation();
  const { user, isAdmin, loading } = useUserRole();

  useEffect(() => {
    if (!loading && !user) navigate("/?login=true&redirect=/admin");
  }, [loading, user]);

  const commonMenu = [
    { path: "/admin",
  label: "📊 Dashboard",
  exact: true  },
    { path: "/admin/orders",
  label: "🛍 Mis órdenes"                      },
    { path: "/admin/publicaciones",
  label: "♻️ Mis publicaciones"                },
    { path: "/admin/biblioteca",
  label: "🗂 Biblioteca"   },
    { path: "/admin/editor",
  label: "🎨 Editor"       },
    { path: "/admin/export",
  label: "📤 Exportar" },`n    { path: "/admin/profile",
  label: "👤 Mi perfil"    },
  ];
  const adminMenu = [
    { path: "/admin/catalog",
  label: "📋 Catálogo",
  children: [{ path: "/admin/catalog/articulos",
  label: "📝 Artículos" }] },
    { path: "/admin/analytics",
  label: "📈 Analytics"    },
    { path: "/admin/ml",
  label: "🟡 MercadoLibre" },
  ];
  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  if (loading) return (
    <div style={{ minHeight:"100vh",
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  background: SIDEBAR_BG }}>
      <div style={{ color: ACCENT,
  fontSize:"1.1rem" }}>Cargando...</div>
    </div>
  );

  return (
    <div style={{ display:"flex",
  minHeight:"100vh",
  fontFamily:"DM Sans, sans-serif",
  background:"#F4F5F7" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width:"220px",
  background: SIDEBAR_BG,
  display:"flex",
  flexDirection:"column",
  position:"sticky",
  top:0,
  height:"100vh",
  flexShrink:0 }}>

        {/* Logo */}
        <div style={{ padding:"0 1.5rem",
  height:"70px",
  display:"flex",
  alignItems:"center" }}>
          <Link to="/" style={{ textDecoration:"none",
  display:"flex",
  alignItems:"center" }}>
            <div style={{ color: ACCENT,
  fontWeight:900,
  fontSize:"1.75rem",
  letterSpacing:"-0.03em",
  lineHeight:1 }}>
              Charlie Market
            </div>
          </Link>
        </div>

        {/* User info + Avatar */}
        <UserAvatar user={user} isAdmin={isAdmin} />

        {/* Nav */}
        <nav style={{ flex:1,
  padding:"0.75rem 0",
  overflowY:"auto" }}>

          {/* Sección General */}
          <div style={{ padding:"0.5rem 1.5rem 0.3rem",
  fontSize:"0.63rem",
  fontWeight:700,
  color:"rgba(255,255,255,0.3)",
  textTransform:"uppercase",
  letterSpacing:"0.1em" }}>
            General
          </div>
          {commonMenu.map(item => {
            const active = isActive(item.path, item.exact);
            return (
              <Link key={item.path} to={item.path} style={{
                display:"block",
  padding:"0.55rem 1.5rem",
  textDecoration:"none",
  fontSize:"0.875rem",
  background: active ? "rgba(255,122,0,0.15)" : "transparent",
  color: active ? ACCENT : "rgba(255,255,255,0.62)",
  borderLeft: active ? "3px solid " + ACCENT : "3px solid transparent",
  fontWeight: active ? 600 : 400,
  transition:"all 0.12s",
              }}>{item.label}</Link>
            );
          })}

          {/* Sección Admin */}
          {isAdmin && (
            <>
              <div style={{ padding:"0.75rem 1.5rem 0.3rem",
  fontSize:"0.63rem",
  fontWeight:700,
  color:"rgba(255,255,255,0.3)",
  textTransform:"uppercase",
  letterSpacing:"0.1em",
  marginTop:"0.5rem" }}>
                Administración
              </div>
              {adminMenu.map(item => {
                const active = isActive(item.path, item.exact);
                return (
                  <div key={item.path}>
                    <Link to={item.path} style={{
                      display:"block",
  padding:"0.55rem 1.5rem",
  textDecoration:"none",
  fontSize:"0.875rem",
  background: active ? `rgba(255,122,0,0.15)` : "transparent",
  color: active ? ACCENT : "rgba(255,255,255,0.62)",
  borderLeft: active ? "3px solid " + ACCENT : "3px solid transparent",
  fontWeight: active ? 600 : 400,
  transition:"all 0.12s",
                    }}>{item.label}</Link>
                    {active && (item as any).children?.map((child: any) => {
                      const childActive = isActive(child.path);
                      return (
                        <Link key={child.path} to={child.path} style={{
                          display:"block",
  padding:"0.4rem 1.5rem 0.4rem 2.75rem",
  textDecoration:"none",
  fontSize:"0.8rem",
  background: childActive ? `rgba(255,122,0,0.1)` : "transparent",
  color: childActive ? ACCENT : "rgba(255,255,255,0.4)",
  borderLeft: childActive ? `3px solid ${ACCENT}` : "3px solid transparent",
  fontWeight: childActive ? 600 : 400,
  transition:"all 0.12s",
                        }}>{child.label}</Link>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* Cerrar sesión */}
        <div style={{ padding:"1rem 1.5rem",
  borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
            style={{ width:"100%",
  padding:"0.45rem 0.75rem",
  background:"transparent",
  border:"1px solid rgba(255,255,255,0.18)",
  color:"rgba(255,255,255,0.5)",
  borderRadius:"7px",
  cursor:"pointer",
  fontSize:"0.78rem",
  transition:"all 0.15s" }}>
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex:1,
  display:"flex",
  flexDirection:"column",
  minWidth:0 }}>

        {/* Topbar */}
        <header style={{ background: SIDEBAR_BG,
  padding:"0 2rem",
  height:"70px",
  display:"flex",
  alignItems:"center",
  justifyContent:"space-between",
  position:"sticky",
  top:0,
  zIndex:10 }}>
          <h1 style={{ margin:0,
  fontSize:"1.25rem",
  fontWeight:700,
  color:"rgba(255,255,255,0.9)" }}>
            {(() => {
            const all = [...commonMenu, ...adminMenu];
            const parent = all.find(m => isActive(m.path, m.exact));
            const child = (parent as any)?.children?.find((c: any) => isActive(c.path));
            const parentLabel = parent?.label?.split(" ").slice(1).join(" ") || "Dashboard";
            const childLabel = child?.label?.split(" ").slice(1).join(" ");
            return childLabel ? `${parentLabel} — ${childLabel}` : parentLabel;
          })()}
          </h1>
          <button onClick={() => window.location.reload()}
            title="Actualizar"
            style={{ background:"transparent",
  border:"none",
  color:"rgba(255,255,255,0.7)",
  cursor:"pointer",
  fontSize:"1.5rem",
  lineHeight:1,
  padding:"0 0.25rem",
  transition:"color 0.15s" }}
            onMouseEnter={e=>(e.currentTarget.style.color="#fff")}
            onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.7)")}>
            ↻
          </button>
          {/* Toggle Market / SH — interruptor físico */}
          <div style={{display:"flex",
  alignItems:"center",
  gap:"8px",
  marginRight:"4px"}}>
            <span style={{fontSize:"0.72rem",
  fontWeight:700,
  color:isSH?"rgba(255,255,255,.4)":"rgba(255,255,255,.9)",
  transition:"all .2s",
  letterSpacing:".03em"}}>MKT</span>
            <div onClick={()=>setIsSH(p=>!p)} style={{
              width:44,
  height:24,
  borderRadius:12,
  cursor:"pointer",
  position:"relative",
  flexShrink:0,
  background:isSH?"#1DC878":"#FF7A00",
  boxShadow:"inset 0 2px 6px rgba(0,0,0,.3), 0 1px 0 rgba(255,255,255,.1)",
  transition:"background .25s",
            }}>
              <div style={{
                position:"absolute",
  top:3,
  left:isSH?"calc(100% - 21px)":"3px",
  width:18,
  height:18,
  borderRadius:"50%",
  background:"#fff",
  boxShadow:"0 2px 5px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.2)",
  transition:"left .22s cubic-bezier(.4,0,.2,1)",
              }}/>
            </div>
            <span style={{fontSize:"0.72rem",
  fontWeight:700,
  color:isSH?"rgba(255,255,255,.9)":"rgba(255,255,255,.4)",
  transition:"all .2s",
  letterSpacing:".03em"}}>SH</span>
          </div>
          <Link to="/" style={{ color: ACCENT,
  textDecoration:"none",
  fontSize:"0.82rem",
  fontWeight:600,
  padding:"0.35rem 0.9rem",
  border:`1px solid ${ACCENT}`,
  borderRadius:"6px",
  transition:"all 0.15s" }}>
            Ver tienda
          </Link>
        </header>

        {/* Content */}
        <main style={{ flex:1,
  overflow:"auto",
  padding:"2rem" }}>
          <ShopContext.Provider value={{isSH,setIsSH,topStats,setTopStats}}>
            <Outlet context={{ user, isAdmin }} />
          </ShopContext.Provider>
        </main>
      </div>
    </div>
  );
}


