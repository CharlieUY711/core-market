const BASE = "/api/cargamasiva";

export interface CargaMasivaResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function importCatalogFromUrl(
  url: string
): Promise<CargaMasivaResult> {
  const res = await fetch(`${BASE}/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function importCatalogFromCsv(
  file: File
): Promise<CargaMasivaResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE}/csv`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function importCatalogFromPdf(
  file: File
): Promise<CargaMasivaResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE}/pdf`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}
