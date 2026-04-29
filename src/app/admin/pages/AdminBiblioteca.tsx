import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router";
import { supabase } from "../../../utils/supabase/client";

const ACCENT = "#FF7A00";
const BLUE   = "#0F3460";

interface MediaItem {
  id: string;
  bucket: string;
  path: string;
  tipo: "imagen" | "video";
  nombre: string;
  size_bytes: number;
  width?: number;
  height?: number;
  duracion_seg?: number;
  thumbnail_path?: string;
  status: "uploading" | "ready" | "failed";
  categoria: "articulo" | "documento" | "otro";
  etiquetas: string[];
  created_at: string;
  url?: string;
}

interface UploadItem {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "failed";
  error?: string;
}

interface Props {
  mode?: "page" | "modal";
  maxImages?: number;
  maxVideos?: number;
  onSelect?: (items: MediaItem[]) => void;
  selectedIds?: string[];
}

function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function getThumbnailUrl(item: MediaItem): string {
  if (item.tipo === "video") {
    if (item.thumbnail_path) return getPublicUrl("biblioteca", item.thumbnail_path);
    return "";
  }
  const url = getPublicUrl(item.bucket, item.path);
  return `${url}?width=200&height=200&resize=cover`;
}

function fmtSize(b: number): string {
  if (!b) return "?";
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${Math.round(b / 1024)}KB`;
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function AdminBiblioteca({
  mode = "page",
  maxImages = 9,
  maxVideos = 5,
  onSelect,
  selectedIds = [],
}: Props) {
  const ctx = useOutletContext<any>() || {};
  const { user } = ctx;

  const [tab, setTab]           = useState<"biblioteca" | "subir">("biblioteca");
  const [items, setItems]       = useState<MediaItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [uploads, setUploads]   = useState<UploadItem[]>([]);
  const [filter, setFilter]     = useState<"all" | "imagen" | "video">("all");
  const [search, setSearch]     = useState("");
  const [filterCat, setFilterCat] = useState<"all"|"articulo"|"documento"|"otro">("all");
  const [uploadCat, setUploadCat] = useState<"articulo"|"documento"|"otro">("articulo");
  const [uploadTags, setUploadTags] = useState("");
  const [toast, setToast]       = useState<{ text: string; ok: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const notify = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      const { data, error } = await supabase
        .from("media_library")
        .select("*")
        .eq("user_id", u.id)
        .eq("status", "ready")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const withUrls = (data || []).map(item => ({
        ...item,
        url: getPublicUrl(item.bucket, item.path),
      }));
      setItems(withUrls);
    } catch (e: any) {
      notify(e.message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Capturar thumbnail de video via canvas
  const captureVideoThumb = async (
    file: File,
    userId: string,
    thumbName: string
  ): Promise<string | null> => {
    return new Promise(resolve => {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 1;
      video.onloadeddata = async () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 320; canvas.height = 180;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(video, 0, 0, 320, 180);
          const blob: Blob = await new Promise(r => canvas.toBlob(b => r(b!), "image/jpeg", 0.8));
          const thumbPath = `${userId}/${thumbName}`;
          const { error } = await supabase.storage.from("biblioteca").upload(thumbPath, blob, { upsert: true });
          URL.revokeObjectURL(video.src);
          resolve(error ? null : thumbPath);
        } catch { resolve(null); }
      };
      video.onerror = () => resolve(null);
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { notify("Sesión expirada", false); return; }

    const fileArr = Array.from(files);
    const newUploads: UploadItem[] = fileArr.map(f => ({ file: f, progress: 0, status: "pending" }));
    setUploads(prev => [...newUploads, ...prev]);
    setTab("subir");

    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      const isVideo = file.type.startsWith("video/");
      const bucket  = isVideo ? "videos" : "biblioteca";
      const ext     = file.name.split(".").pop() || "bin";
      const rand    = Math.random().toString(36).slice(2, 7);
      const ts      = Date.now();
      const fname   = `${u.id}/${ts}_${rand}.${ext}`;

      setUploads(prev => prev.map((u2, idx) =>
        idx === newUploads.length - fileArr.length + i ? { ...u2, status: "uploading", progress: 10 } : u2
      ));

      try {
        // Simular progreso
        const prog = setInterval(() => {
          setUploads(prev => prev.map((u2, idx) =>
            idx === newUploads.length - fileArr.length + i && u2.progress < 85
              ? { ...u2, progress: u2.progress + 15 }
              : u2
          ));
        }, 300);

        const { error: uploadError } = await supabase.storage.from(bucket).upload(fname, file, { upsert: false });
        clearInterval(prog);

        if (uploadError) throw uploadError;

        // Thumbnail para videos
        let thumbPath: string | null = null;
        let duracion: number | null = null;
        if (isVideo) {
          thumbPath = await captureVideoThumb(file, u.id, `thumb_${ts}_${rand}.jpg`);
          // Obtener duración
          duracion = await new Promise(r => {
            const v = document.createElement("video");
            v.src = URL.createObjectURL(file);
            v.onloadedmetadata = () => { r(Math.round(v.duration)); URL.revokeObjectURL(v.src); };
            v.onerror = () => r(null);
          });
        }

        // Dimensiones para imágenes
        let width: number | null = null, height: number | null = null;
        if (!isVideo) {
          const dims: [number,number] | null = await new Promise(r => {
            const img = new Image();
            img.onload = () => { r([img.naturalWidth, img.naturalHeight]); URL.revokeObjectURL(img.src); };
            img.onerror = () => r(null);
            img.src = URL.createObjectURL(file);
          });
          if (dims) { [width, height] = dims; }
        }

        // Insertar en media_library
        const { error: dbError } = await supabase.from("media_library").insert({
          user_id:       u.id,
          bucket,
          path:          fname,
          tipo:          isVideo ? "video" : "imagen",
          nombre:        file.name,
          size_bytes:    file.size,
          width,
          height,
          duracion_seg:  duracion,
          thumbnail_path: thumbPath,
          status:        "ready",
          categoria:     uploadCat,
          etiquetas:     uploadTags.split(",").map(t => t.trim()).filter(Boolean),
        });

        if (dbError) throw dbError;

        setUploads(prev => prev.map((u2, idx) =>
          idx === newUploads.length - fileArr.length + i ? { ...u2, status: "done", progress: 100 } : u2
        ));

      } catch (e: any) {
        setUploads(prev => prev.map((u2, idx) =>
          idx === newUploads.length - fileArr.length + i ? { ...u2, status: "failed", error: e.message } : u2
        ));
      }
    }

    await load();
    setTimeout(() => setTab("biblioteca"), 500);
  };

  const toggleSelect = (item: MediaItem) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        const selImages = items.filter(i => next.has(i.id) && i.tipo === "imagen").length;
        const selVideos = items.filter(i => next.has(i.id) && i.tipo === "video").length;
        if (item.tipo === "imagen" && selImages >= maxImages) {
          notify(`Máximo ${maxImages} imágenes`, false); return prev;
        }
        if (item.tipo === "video" && selVideos >= maxVideos) {
          notify(`Máximo ${maxVideos} videos`, false); return prev;
        }
        next.add(item.id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (!onSelect) return;
    const sel = items.filter(i => selected.has(i.id));
    onSelect(sel);
  };

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    await supabase.storage.from(item.bucket).remove([item.path]);
    if (item.thumbnail_path) await supabase.storage.from("biblioteca").remove([item.thumbnail_path]);
    await supabase.from("media_library").delete().eq("id", item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
    setSelected(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    notify("Eliminado");
  };

  const filtered = items.filter(i => {
    const matchType   = filter === "all" || i.tipo === filter;
    const matchSearch = !search || i.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (i.etiquetas || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat    = filterCat === "all" || i.categoria === filterCat;
    return matchType && matchSearch && matchCat;
  });

  const selImages = items.filter(i => selected.has(i.id) && i.tipo === "imagen").length;
  const selVideos = items.filter(i => selected.has(i.id) && i.tipo === "video").length;

  const inp: React.CSSProperties = {
    padding: "0.5rem 0.75rem", border: "1.5px solid #E5E7EB", borderRadius: "8px",
    fontSize: "0.85rem", outline: "none", fontFamily: "DM Sans, sans-serif",
    background: "#fff", color: "#111",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", height: mode === "modal" ? "100%" : "auto" }}>

      {toast && (
        <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9999,
          padding: "0.75rem 1.25rem", borderRadius: "10px", fontWeight: 600, fontSize: "0.875rem",
          background: toast.ok ? "#f0fdf4" : "#fef2f2",
          color: toast.ok ? "#166534" : "#dc2626",
          border: `1px solid ${toast.ok ? "#6BB87A" : "#ef4444"}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1.5px solid #E5E7EB" }}>
        {(["biblioteca", "subir"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "0.6rem 1.25rem", background: "none", border: "none",
            borderBottom: tab === t ? `2.5px solid ${ACCENT}` : "2.5px solid transparent",
            color: tab === t ? ACCENT : "#6B7280", fontWeight: tab === t ? 700 : 400,
            fontSize: "0.875rem", cursor: "pointer", marginBottom: "-1.5px",
          }}>
            {t === "biblioteca" ? `🗂 Biblioteca (${items.length})` : "⬆ Subir"}
          </button>
        ))}
        {mode === "modal" && selected.size > 0 && (
          <button onClick={handleConfirm} style={{
            marginLeft: "auto", padding: "0.5rem 1.25rem",
            background: ACCENT, color: "#fff", border: "none",
            borderRadius: "8px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
          }}>
            Usar seleccionados ({selected.size})
          </button>
        )}
      </div>

      {/* TAB: BIBLIOTECA */}
      {tab === "biblioteca" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

          {/* Toolbar */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar archivos..." style={{ ...inp, flex: 1, minWidth: 160 }} />
            <div style={{ display: "flex", gap: "4px" }}>
              {(["all", "imagen", "video"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "0.45rem 0.75rem", borderRadius: 7,
                  border: `1.5px solid ${filter === f ? ACCENT : "#E5E7EB"}`,
                  background: filter === f ? `rgba(255,122,0,.08)` : "#fff",
                  color: filter === f ? ACCENT : "#6B7280",
                  fontWeight: filter === f ? 700 : 400, cursor: "pointer", fontSize: "0.8rem",
                }}>
                  {f === "all" ? "Todo" : f === "imagen" ? "🖼 Imgs" : "🎬 Videos"}
                </button>
              ))}
            </div>
            <input ref={inputRef} type="file" multiple accept="image/*,video/*"
              style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
            <div style={{ display:"flex", gap:"4px" }}>
              {(["all","articulo","documento","otro"] as const).map(c => (
                <button key={c} onClick={() => setFilterCat(c)} style={{
                  padding:"0.4rem 0.6rem", borderRadius:7, fontSize:"0.75rem",
                  border:`1.5px solid ${filterCat===c ? BLUE : "#E5E7EB"}`,
                  background: filterCat===c ? `rgba(15,52,96,.08)` : "#fff",
                  color: filterCat===c ? BLUE : "#6B7280",
                  fontWeight: filterCat===c ? 700 : 400, cursor:"pointer",
                }}>
                  {c==="all"?"Todas":c==="articulo"?"🛍 Artículo":c==="documento"?"📄 Doc":"📎 Otro"}
                </button>
              ))}
            </div>
            <button onClick={() => inputRef.current?.click()} style={{
              padding: "0.45rem 1rem", background: ACCENT, color: "#fff",
              border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
            }}>⬆ Subir</button>
            <button onClick={load} style={{ ...inp, cursor: "pointer", fontSize: "1rem", color: "#6B7280", padding: "0.45rem 0.6rem" }}>↻</button>
          </div>

          {/* Contadores selección */}
          {mode === "modal" && (
            <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "#6B7280" }}>
              <span>🖼 {selImages}/{maxImages} imágenes</span>
              <span>🎬 {selVideos}/{maxVideos} videos</span>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#9CA3AF" }}>Cargando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "3rem" }}>🗂</div>
              <div style={{ color: "#9CA3AF", marginTop: "0.5rem" }}>
                {search ? `Sin resultados para "${search}"` : "Biblioteca vacía — subí archivos"}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.6rem" }}>
              {filtered.map(item => {
                const isSel = selected.has(item.id);
                const thumb = getThumbnailUrl(item);
                return (
                  <div key={item.id}
                    onClick={() => mode === "modal" ? toggleSelect(item) : undefined}
                    style={{
                      border: `2px solid ${isSel ? ACCENT : "#E5E7EB"}`,
                      borderRadius: 10, overflow: "hidden", cursor: mode === "modal" ? "pointer" : "default",
                      background: "#fff", position: "relative",
                      boxShadow: isSel ? `0 0 0 3px rgba(255,122,0,.2)` : "0 1px 3px rgba(0,0,0,.05)",
                      transition: "all .15s",
                    }}>

                    {/* Preview */}
                    <div style={{ height: 110, background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                      {item.tipo === "imagen" ? (
                        <img src={thumb} alt={item.nombre}
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : thumb ? (
                        <img src={thumb} alt={item.nombre}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ fontSize: "2.5rem" }}>🎬</div>
                      )}
                      {item.tipo === "video" && (
                        <div style={{ position: "absolute", bottom: 4, right: 4,
                          background: "rgba(0,0,0,.6)", color: "#fff",
                          fontSize: "9px", padding: "1px 5px", borderRadius: 4 }}>
                          {item.duracion_seg ? `${item.duracion_seg}s` : "video"}
                        </div>
                      )}
                      {isSel && (
                        <div style={{ position: "absolute", top: 5, right: 5,
                          width: 20, height: 20, borderRadius: "50%",
                          background: ACCENT, display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: "0.7rem", color: "#fff" }}>✓</div>
                      )}
                      {mode === "modal" && (
                        <div style={{ position: "absolute", top: 5, left: 5,
                          width: 18, height: 18, borderRadius: 4,
                          border: `2px solid ${isSel ? ACCENT : "rgba(255,255,255,.8)"}`,
                          background: isSel ? ACCENT : "rgba(255,255,255,.6)",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isSel && <span style={{ color: "#fff", fontSize: "10px" }}>✓</span>}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: "0.4rem 0.5rem" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#374151",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.nombre.replace(/^\d+_[a-z0-9]+\./, ".")}
                      </div>
                      <div style={{ fontSize: "10px", color: "#9CA3AF" }}>
                        {fmtSize(item.size_bytes)} · {fmtDate(item.created_at)}
                      </div>
                      {item.etiquetas?.length > 0 && (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:"2px", marginTop:"2px" }}>
                          {item.etiquetas.slice(0,3).map(t => (
                            <span key={t} style={{ fontSize:"9px", padding:"1px 4px",
                              background:"rgba(15,52,96,.08)", color:BLUE,
                              borderRadius:3, fontWeight:600 }}>#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: "flex", borderTop: "1px solid #F3F4F6" }}>
                      <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(item.url || ""); notify("URL copiada"); }}
                        style={{ flex: 1, padding: "0.3rem", background: "none", border: "none",
                          cursor: "pointer", fontSize: "10px", color: "#6B7280" }}>📋</button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(item); }}
                        style={{ flex: 1, padding: "0.3rem", background: "none", border: "none",
                          cursor: "pointer", fontSize: "10px", color: "#EF4444" }}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Confirmar modal */}
          {mode === "modal" && selected.size > 0 && (
            <div style={{ position: "sticky", bottom: 0, background: "#fff", padding: "0.75rem",
              borderTop: "1px solid #E5E7EB", display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#374151", flex: 1 }}>
                {selImages > 0 && `${selImages} imagen(es)`} {selVideos > 0 && `${selVideos} video(s)`} seleccionado(s)
              </span>
              <button onClick={() => setSelected(new Set())} style={{
                padding: "0.5rem 1rem", background: "none", border: "1.5px solid #E5E7EB",
                borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", color: "#6B7280",
              }}>Limpiar</button>
              <button onClick={handleConfirm} style={{
                padding: "0.5rem 1.25rem", background: ACCENT, color: "#fff",
                border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
              }}>Usar seleccionados →</button>
            </div>
          )}
        </div>
      )}

      {/* TAB: SUBIR */}
      {tab === "subir" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = ACCENT; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#E5E7EB"; handleFiles(e.dataTransfer.files); }}
            style={{ border: "2px dashed #E5E7EB", borderRadius: 12, padding: "2rem",
              textAlign: "center", cursor: "pointer", color: "#9CA3AF", transition: "border-color .2s" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⬆</div>
            <div style={{ fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>
              Arrastrá archivos o hacé click
            </div>
            <div style={{ fontSize: "0.8rem" }}>
              Imágenes (JPG, PNG, WEBP) · Videos MP4 hasta 30s
            </div>
            <input ref={inputRef} type="file" multiple accept="image/*,video/*"
              style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
          </div>

          {/* Opciones de subida */}
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:160 }}>
              <label style={{ fontSize:"0.78rem", fontWeight:700, color:"#374151", display:"block", marginBottom:"4px" }}>Categoría</label>
              <div style={{ display:"flex", gap:"4px" }}>
                {(["articulo","documento","otro"] as const).map(c => (
                  <button key={c} onClick={() => setUploadCat(c)} style={{
                    flex:1, padding:"0.4rem 0.4rem", borderRadius:7, fontSize:"0.75rem",
                    border:`1.5px solid ${uploadCat===c ? ACCENT : "#E5E7EB"}`,
                    background: uploadCat===c ? `rgba(255,122,0,.08)` : "#fff",
                    color: uploadCat===c ? ACCENT : "#6B7280",
                    fontWeight: uploadCat===c ? 700 : 400, cursor:"pointer",
                  }}>
                    {c==="articulo"?"🛍 Artículo":c==="documento"?"📄 Doc":"📎 Otro"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex:2, minWidth:200 }}>
              <label style={{ fontSize:"0.78rem", fontWeight:700, color:"#374151", display:"block", marginBottom:"4px" }}>
                Etiquetas <span style={{ fontWeight:400, color:"#9CA3AF" }}>(separadas por coma)</span>
              </label>
              <input
                value={uploadTags}
                onChange={e => setUploadTags(e.target.value)}
                placeholder="ej: verano, electro, oferta"
                style={{ width:"100%", padding:"0.45rem 0.75rem", border:"1.5px solid #E5E7EB",
                  borderRadius:8, fontSize:"0.85rem", outline:"none", boxSizing:"border-box" as const }}
              />
            </div>
          </div>

          {/* Lista de uploads */}
          {uploads.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {uploads.map((u, i) => (
                <div key={i} style={{ background: "#F9FAFB", borderRadius: 8,
                  padding: "0.6rem 0.75rem", border: "1px solid #E5E7EB" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#374151",
                      maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.file.name}
                    </span>
                    <span style={{ fontSize: "0.75rem", color:
                      u.status === "done" ? "#16a34a" :
                      u.status === "failed" ? "#dc2626" : "#6B7280" }}>
                      {u.status === "done" ? "✓ Listo" :
                       u.status === "failed" ? "✗ Error" :
                       u.status === "uploading" ? `${u.progress}%` : "En cola"}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#E5E7EB", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2, transition: "width .3s",
                      width: `${u.progress}%`,
                      background: u.status === "failed" ? "#ef4444" :
                                  u.status === "done"   ? "#22c55e" : ACCENT,
                    }} />
                  </div>
                  {u.error && <div style={{ fontSize: "0.72rem", color: "#dc2626", marginTop: "3px" }}>{u.error}</div>}
                </div>
              ))}
              <button onClick={() => { setUploads([]); setTab("biblioteca"); }}
                style={{ padding: "0.5rem", background: "none", border: "1.5px solid #E5E7EB",
                  borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", color: "#6B7280" }}>
                Limpiar lista
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}