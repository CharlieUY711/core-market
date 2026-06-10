"use client";

import { useState } from "react";
import {
  importCatalogFromUrl,
  importCatalogFromCsv,
  importCatalogFromPdf,
} from "@/api/cargaMasivaClient";

export default function AdminCargaMasiva() {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUrl = async () => {
    setLoading(true);
    const res = await importCatalogFromUrl(url);
    setResult(res);
    setLoading(false);
  };

  const handleCsv = async () => {
    if (!file) return;
    setLoading(true);
    const res = await importCatalogFromCsv(file);
    setResult(res);
    setLoading(false);
  };

  const handlePdf = async () => {
    if (!file) return;
    setLoading(true);
    const res = await importCatalogFromPdf(file);
    setResult(res);
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Carga Masiva</h1>

      <section style={{ marginTop: 20 }}>
        <h2>Importar desde URL</h2>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          style={{ width: "300px", marginRight: 10 }}
        />
        <button onClick={handleUrl} disabled={loading}>
          Importar
        </button>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Importar CSV / PDF</h2>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div style={{ marginTop: 10 }}>
          <button onClick={handleCsv} disabled={loading}>
            Importar CSV
          </button>
          <button onClick={handlePdf} disabled={loading} style={{ marginLeft: 10 }}>
            Importar PDF
          </button>
        </div>
      </section>

      {loading && <p style={{ marginTop: 20 }}>Procesando...</p>}

      {result && (
        <pre style={{ marginTop: 20, background: "#111", color: "#0f0", padding: 20 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
