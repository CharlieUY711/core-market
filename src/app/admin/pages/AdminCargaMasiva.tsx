"use client";

import { useState, useRef } from "react";
import {
  importCatalogFromUrl,
  importCatalogFromCsv,
  importCatalogFromPdf,
  CargaMasivaResult,
} from "@/api/cargaMasivaClient";

type ImportMode = "url" | "csv" | "pdf";

const MODES: { id: ImportMode; label: string; accept?: string }[] = [
  { id: "url", label: "URL" },
  { id: "csv", label: "CSV", accept: ".csv,text/csv" },
  { id: "pdf", label: "PDF", accept: ".pdf,application/pdf" },
];

export default function AdminCargaMasiva() {
  const [activeMode, setActiveMode] = useState<ImportMode>("url");
  const [urlValue, setUrlValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CargaMasivaResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMode = MODES.find((m) => m.id === activeMode)!;

  function handleModeChange(mode: ImportMode) {
    setActiveMode(mode);
    setResult(null);
    setFile(null);
    setUrlValue("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImport() {
    setLoading(true);
    setResult(null);
    try {
      let res: CargaMasivaResult;

      if (activeMode === "url") {
        if (!urlValue.trim()) {
          setResult({ success: false, error: "Ingresá una URL válida." });
          return;
        }
        res = await importCatalogFromUrl(urlValue.trim());
      } else if (activeMode === "csv") {
        if (!file) {
          setResult({ success: false, error: "Seleccioná un archivo CSV." });
          return;
        }
        res = await importCatalogFromCsv(file);
      } else {
        if (!file) {
          setResult({ success: false, error: "Seleccioná un archivo PDF." });
          return;
        }
        res = await importCatalogFromPdf(file);
      }

      setResult(res);
    } catch {
      setResult({ success: false, error: "Error inesperado al importar." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cm-root">
      {/* ── Header ── */}
      <header className="cm-header">
        <span className="cm-header-eyebrow">Admin</span>
        <h1 className="cm-header-title">Carga Masiva</h1>
        <p className="cm-header-sub">
          Importá catálogos desde URL, CSV o PDF de forma instantánea.
        </p>
      </header>

      {/* ── Card ── */}
      <div className="cm-card">
        {/* Mode tabs */}
        <div className="cm-tabs" role="tablist">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={activeMode === m.id}
              className={`cm-tab ${activeMode === m.id ? "cm-tab--active" : ""}`}
              onClick={() => handleModeChange(m.id)}
            >
              {m.id === "url" && <IconLink />}
              {m.id === "csv" && <IconTable />}
              {m.id === "pdf" && <IconFile />}
              {m.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="cm-body">
          {activeMode === "url" ? (
            <div className="cm-field">
              <label className="cm-label" htmlFor="cm-url">
                URL del catálogo
              </label>
              <input
                id="cm-url"
                type="url"
                className="cm-input"
                placeholder="https://proveedor.com/catalogo"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
              />
            </div>
          ) : (
            <div className="cm-field">
              <label className="cm-label" htmlFor="cm-file">
                Archivo {currentMode.label}
              </label>
              <div
                className="cm-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files[0];
                  if (dropped) setFile(dropped);
                }}
              >
                {file ? (
                  <>
                    <IconCheck />
                    <span className="cm-dropzone-name">{file.name}</span>
                    <span className="cm-dropzone-hint">
                      {(file.size / 1024).toFixed(1)} KB — clic para cambiar
                    </span>
                  </>
                ) : (
                  <>
                    <IconUpload />
                    <span className="cm-dropzone-hint">
                      Arrastrá o hacé clic para subir un {currentMode.label}
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  id="cm-file"
                  type="file"
                  accept={currentMode.accept}
                  style={{ display: "none" }}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          )}

          <button
            className="cm-btn"
            onClick={handleImport}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="cm-spinner" aria-hidden="true" />
                Importando…
              </>
            ) : (
              <>
                <IconImport />
                Importar {currentMode.label}
              </>
            )}
          </button>
        </div>

        {/* Result */}
        {result !== null && (
          <div
            className={`cm-result ${result.success ? "cm-result--ok" : "cm-result--err"}`}
            role="status"
          >
            <div className="cm-result-badge">
              {result.success ? <IconCheck /> : <IconAlert />}
              <span>{result.success ? "Importación exitosa" : "Error"}</span>
            </div>
            <pre className="cm-pre">
              {JSON.stringify(result.success ? result.data : result.error, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* ── Scoped styles with CORE Market design tokens ── */}
      <style>{`
        .cm-root {
          min-height: 100%;
          background: var(--color-bg-main, #F2F5FA);
          color: var(--color-text-dark, #0D2B55);
          font-family: var(--font-base, Calibri, 'Segoe UI', system-ui, sans-serif);
          padding: var(--space-6, 32px) var(--space-4, 16px);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ── Header ── */
        .cm-header {
          width: 100%;
          max-width: 640px;
          margin-bottom: var(--space-5, 24px);
        }
        .cm-header-eyebrow {
          display: inline-block;
          font-size: 9px;
          font-weight: var(--fw-black, 700);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--brand-primary, #1A4F9C);
          margin-bottom: var(--space-2, 8px);
        }
        .cm-header-title {
          font-size: 20px;
          font-weight: var(--fw-black, 700);
          letter-spacing: -0.01em;
          margin: 0 0 var(--space-1, 4px);
          color: var(--color-text-dark, #0D2B55);
        }
        .cm-header-sub {
          font-size: 13px;
          color: var(--gray-400, #7A7A7A);
          margin: 0;
        }

        /* ── Card ── */
        .cm-card {
          width: 100%;
          max-width: 640px;
          background: #fff;
          border: 1px solid var(--color-border, #C8D5E8);
          border-radius: var(--radius-lg, 12px);
          overflow: hidden;
          box-shadow: var(--shadow-card, 0 2px 8px rgba(13,43,85,.08));
        }

        /* ── Tabs ── */
        .cm-tabs {
          display: flex;
          border-bottom: 1px solid var(--color-border, #C8D5E8);
          background: var(--gray-50, #F2F5FA);
        }
        .cm-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-1, 4px);
          padding: var(--space-3, 12px) var(--space-2, 8px);
          background: none;
          border: none;
          color: var(--gray-400, #7A7A7A);
          font-size: 10px;
          font-weight: var(--fw-bold, 600);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.15s, background 0.15s;
          border-bottom: 2px solid transparent;
        }
        .cm-tab svg { width: 14px; height: 14px; }
        .cm-tab:hover {
          color: var(--brand-primary, #1A4F9C);
          background: var(--brand-primary-light, rgba(26,79,156,.1));
        }
        .cm-tab--active {
          color: var(--color-accent, #C9A84C);
          background: var(--brand-accent-light, rgba(201,168,76,.1));
          border-bottom-color: var(--color-accent, #C9A84C);
        }

        /* ── Body ── */
        .cm-body {
          padding: var(--space-5, 24px) var(--space-4, 16px);
          display: flex;
          flex-direction: column;
          gap: var(--space-4, 16px);
        }

        /* ── Field ── */
        .cm-field { display: flex; flex-direction: column; gap: var(--space-1, 4px); }
        .cm-label {
          font-size: 9px;
          font-weight: var(--fw-bold, 600);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gray-400, #7A7A7A);
        }
        .cm-input {
          background: #fff;
          border: 1px solid var(--color-border, #C8D5E8);
          border-radius: var(--radius-sm, 4px);
          padding: var(--space-2, 8px) var(--space-3, 12px);
          color: var(--color-text-dark, #0D2B55);
          font-size: 13px;
          font-family: var(--font-base, Calibri, 'Segoe UI', system-ui, sans-serif);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cm-input::placeholder { color: var(--gray-200, #C8D5E8); }
        .cm-input:focus {
          border-color: var(--brand-primary, #1A4F9C);
          box-shadow: 0 0 0 3px var(--brand-primary-light, rgba(26,79,156,.1));
        }

        /* ── Dropzone ── */
        .cm-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-1, 4px);
          border: 1.5px dashed var(--color-border, #C8D5E8);
          border-radius: var(--radius-md, 8px);
          padding: var(--space-5, 24px) var(--space-4, 16px);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          text-align: center;
          background: var(--gray-50, #F2F5FA);
        }
        .cm-dropzone:hover {
          border-color: var(--brand-primary, #1A4F9C);
          background: var(--brand-primary-light, rgba(26,79,156,.1));
        }
        .cm-dropzone svg { width: 24px; height: 24px; color: var(--gray-200, #C8D5E8); }
        .cm-dropzone:hover svg { color: var(--brand-primary, #1A4F9C); }
        .cm-dropzone-name {
          font-size: 13px;
          font-weight: var(--fw-bold, 600);
          color: var(--color-text-dark, #0D2B55);
          word-break: break-all;
        }
        .cm-dropzone-hint { font-size: 12px; color: var(--gray-400, #7A7A7A); }

        /* ── Button ── */
        .cm-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-1, 4px);
          padding: var(--space-2, 8px) var(--space-4, 16px);
          border: none;
          border-radius: var(--radius-sm, 4px);
          background: var(--brand-primary, #1A4F9C);
          color: #fff;
          font-size: 11px;
          font-weight: var(--fw-bold, 600);
          font-family: var(--font-base, Calibri, 'Segoe UI', system-ui, sans-serif);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s, opacity 0.15s;
        }
        .cm-btn svg { width: 14px; height: 14px; }
        .cm-btn:hover:not(:disabled) {
          background: var(--color-primary-hover, #0D2B55);
          transform: translateY(-1px);
        }
        .cm-btn:active:not(:disabled) { transform: translateY(0); }
        .cm-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ── Spinner ── */
        .cm-spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: cm-spin 0.7s linear infinite;
        }
        @keyframes cm-spin { to { transform: rotate(360deg); } }

        /* ── Result ── */
        .cm-result {
          border-top: 1px solid var(--color-border, #C8D5E8);
          padding: var(--space-4, 16px) var(--space-4, 16px) var(--space-5, 24px);
        }
        .cm-result--ok {
          --cm-accent: var(--color-success, #1D9E75);
          --cm-bg: rgba(29,158,117,.06);
          --cm-border: rgba(29,158,117,.2);
        }
        .cm-result--err {
          --cm-accent: var(--color-danger, #C0392B);
          --cm-bg: rgba(192,57,43,.06);
          --cm-border: rgba(192,57,43,.2);
        }
        .cm-result-badge {
          display: flex;
          align-items: center;
          gap: var(--space-1, 4px);
          font-size: 9px;
          font-weight: var(--fw-black, 700);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--cm-accent);
          margin-bottom: var(--space-2, 8px);
        }
        .cm-result-badge svg { width: 14px; height: 14px; }
        .cm-pre {
          background: var(--cm-bg);
          border: 1px solid var(--cm-border);
          border-radius: var(--radius-md, 8px);
          padding: var(--space-3, 12px);
          font-size: 11px;
          color: var(--gray-600, #4A4A4A);
          overflow: auto;
          max-height: 280px;
          white-space: pre-wrap;
          word-break: break-all;
          margin: 0;
          font-family: var(--font-mono, 'Courier New', monospace);
        }
      `}</style>
    </div>
  );
}

/* ── Inline SVG icons ── */
function IconLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}
function IconTable() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18"/>
    </svg>
  );
}
function IconFile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  );
}
function IconImport() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
