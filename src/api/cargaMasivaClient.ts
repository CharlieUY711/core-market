export async function importCatalogFromUrl(url: string) {
  const res = await fetch("/api/cargamasiva/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  return await res.json();
}

export async function importCatalogFromCsv(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/cargamasiva/csv", {
    method: "POST",
    body: form,
  });

  return await res.json();
}

export async function importCatalogFromPdf(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/cargamasiva/pdf", {
    method: "POST",
    body: form,
  });

  return await res.json();
}
