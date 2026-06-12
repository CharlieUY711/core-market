/**
 * AdminToolEditor.tsx — versión simplificada
 * El editor se monta directo, sin dropzone intermedia.
 * ToolEditor ya tiene su propio drag & drop interno.
 */

import { useState, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";
import ToolEditor from "../../../lib/tool-editor/src/components/ToolEditor";

interface UploadStatus {
  state: "idle" | "uploading" | "done" | "error";
  message: string;
  url?: string;
}

const EDITOR_CONFIG = {
  features: {
    removeBackground: false,
    watermarkVisible: false,
  },
  export: {
    formats: ["jpeg", "png", "webp"],
    defaultFormat: "jpeg",
    defaultQuality: 90,
  },
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]/g, "-").replace(/-+/g, "-");
}

function UploadBanner({ status }: { status: UploadStatus }) {
  if (status.state === "idle") return null;
  const map: Record<string, { bg: string; color: string; icon: string }> = {
    uploading: { bg: "rgba(26,79,156,.08)",  color: "#1A4F9C", icon: "⏳" },
    done:      { bg: "rgba(29,158,117,.08)", color: "#1D9E75", icon: "✓"  },
    error:     { bg: "rgba(192,57,43,.08)",  color: "#C0392B", icon: "✕"  },
  };
  const s = map[status.state];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 16px", fontSize: 12, fontWeight: 500,
      background: s.bg, color: s.color,
      borderBottom: `1px solid ${s.color}22`,
    }}>
      <span>{s.icon}</span>
      <span>{status.message}</span>
      {status.url && status.state === "done" && (
        <a href={status.url} target="_blank" rel="noreferrer"
          style={{ marginLeft: "auto", fontSize: 11, color: "#1A4F9C", fontWeight: 600, textDecoration: "none" }}>
          Ver imagen →
        </a>
      )}
    </div>
  );
}

export default function AdminToolEditor() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ state: "idle", message: "" });
  const [aiEnabled, setAiEnabled]       = useState(false);

  const handleExport = useCallback(async (blob: Blob, format: string) => {
    setUploadStatus({ state: "uploading", message: "Subiendo imagen editada…" });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const ext      = format === "jpeg" ? "jpg" : format;
      const fileName = `edited-${Date.now()}.${ext}`;
      const path     = `uploads/${user.id}/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from("biblioteca").upload(path, blob, { contentType: blob.type, upsert: false });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from("biblioteca").getPublicUrl(path);

      const { error: dbError } = await supabase.from("media_library").insert({
        bucket: "biblioteca", path, tipo: "imagen", nombre: fileName,
        size_bytes: blob.size, categoria: "articulo",
        etiquetas: ["editada", "tool-editor"], status: "ready", user_id: user.id,
        metadata: { format },
      });
      if (dbError) throw dbError;

      setUploadStatus({ state: "done", message: `"${fileName}" guardada en Biblioteca`, url: urlData.publicUrl });
    } catch (err: any) {
      setUploadStatus({ state: "error", message: err.message ?? "Error al subir" });
    }
  }, []);

  const activeConfig = {
    ...EDITOR_CONFIG,
    features: { ...EDITOR_CONFIG.features, removeBackground: aiEnabled },
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      fontFamily: "Calibri, 'Segoe UI', system-ui, sans-serif",
      background: "#F2F5FA",
    }}>
      {/* Topbar mínimo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 16px", background: "#fff",
        borderBottom: "1px solid #C8D5E8",
        boxShadow: "0 1px 4px rgba(13,43,85,.06)", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0D2B55", lineHeight: 1 }}>Editor de imágenes</div>
          <div style={{ fontSize: 11, color: "#7A7A7A", marginTop: 2 }}>Editá y exportá directo a la Biblioteca</div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setAiEnabled(v => !v)}
          style={{
            padding: "5px 12px", borderRadius: 4, cursor: "pointer",
            fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const,
            border: `1px solid ${aiEnabled ? "#1D9E75" : "#C8D5E8"}`,
            background: aiEnabled ? "rgba(29,158,117,.08)" : "transparent",
            color: aiEnabled ? "#1D9E75" : "#7A7A7A", transition: "all .15s",
          }}>
          {aiEnabled ? "✓ AI activa" : "Activar AI"}
        </button>
      </div>

      {/* Banner upload */}
      <UploadBanner status={uploadStatus} />

      {/* Editor — ocupa todo el espacio restante */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ToolEditor
          config={activeConfig}
          onExport={handleExport}
          onError={(err: { message: string }) =>
            setUploadStatus({ state: "error", message: err.message })}
        />
      </div>
    </div>
  );
}
