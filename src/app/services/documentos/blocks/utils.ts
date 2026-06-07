export function fmtMonto(n: number, moneda = "UYU", locale = "es-UY"): string {
  return `${moneda} ${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtFecha(iso?: string, locale = "es-UY"): string {
  return iso
    ? new Date(iso).toLocaleDateString(locale, { day:"2-digit", month:"2-digit", year:"numeric" })
    : new Date().toLocaleDateString(locale,   { day:"2-digit", month:"2-digit", year:"numeric" });
}

export function shortId(id: string, len = 8): string {
  return id.replace(/-/g, "").slice(0, len).toUpperCase();
}

export function qrUrl(data: string, size = 100): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&color=000000&bgcolor=ffffff`;
}

export function calcTotal(items: { cantidad: number; precioUnit: number; descuento?: number }[]): number {
  return items.reduce((sum, i) => {
    const sub  = i.cantidad * i.precioUnit;
    const desc = i.descuento ? sub * (i.descuento / 100) : 0;
    return sum + sub - desc;
  }, 0);
}



