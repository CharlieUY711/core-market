# fix-carrito.ps1
# Ejecutar desde la raíz del proyecto: .\fix-carrito.ps1
# Corrige los 3 bugs del carrito modal vacío.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot   # carpeta donde está este script

# ─── Helpers ──────────────────────────────────────────────────────────────────
function Patch-File {
  param([string]$path, [string]$old, [string]$new, [string]$desc)
  $full = Join-Path $root $path
  if (-not (Test-Path $full)) { Write-Error "No se encontró: $full"; return }
  $content = [System.IO.File]::ReadAllText($full)
  if (-not $content.Contains($old)) { Write-Warning "[$desc] Texto a reemplazar no encontrado en $path — ¿ya fue aplicado?"; return }
  $content = $content.Replace($old, $new)
  [System.IO.File]::WriteAllText($full, $content, [System.Text.Encoding]::UTF8)
  Write-Host "  OK  $desc" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== fix-carrito: aplicando 3 patches ===" -ForegroundColor Cyan
Write-Host ""

# ─── PATCH 1 ──────────────────────────────────────────────────────────────────
# src/services/carritoApi.ts → reemplazar el stub por re-export a la versión canónica
Write-Host "PATCH 1 — src/services/carritoApi.ts (stub → re-export canónico)"

$carritoApiPath = "src\services\carritoApi.ts"
$carritoApiNew  = @'
// carritoApi.ts — re-export hacia la implementación canónica (usa sesion_id)
export {
  getCarrito,
  agregarAlCarrito,
  actualizarItemCarrito,
  eliminarItemCarrito,
  vaciarCarrito,
} from '../app/services/carritoApi';
'@

$full = Join-Path $root $carritoApiPath
if (-not (Test-Path $full)) { Write-Error "No se encontró: $full" }
[System.IO.File]::WriteAllText($full, $carritoApiNew, [System.Text.Encoding]::UTF8)
Write-Host "  OK  $carritoApiPath sobrescrito" -ForegroundColor Green

# ─── PATCH 2 ──────────────────────────────────────────────────────────────────
# MarketPage.tsx — corregir el import de agregarAlCarrito
Write-Host ""
Write-Host "PATCH 2 — MarketPage.tsx: import apuntando al módulo correcto"

Patch-File `
  -path "src\app\public\MarketPage.tsx" `
  -old  "import { agregarAlCarrito } from '../services/carritoApi';" `
  -new  "import { agregarAlCarrito } from '../services/carritoApi'; // re-export → app/services/carritoApi" `
  -desc "import agregarAlCarrito (comentario explicativo)"

# ─── PATCH 3 ──────────────────────────────────────────────────────────────────
# MarketPage.tsx — corregir los argumentos de la llamada
Write-Host ""
Write-Host "PATCH 3 — MarketPage.tsx: argumentos de agregarAlCarrito"

Patch-File `
  -path "src\app\public\MarketPage.tsx" `
  -old  "if (session?.user) await agregarAlCarrito(p.id, session.user.id, m);" `
  -new  "if (session?.user) await agregarAlCarrito(String(p.id), m === 'sh' ? 'secondhand' : 'market', 1, pNum);" `
  -desc "firma correcta: (producto_id, producto_tipo, cantidad, precio_unitario)"

# ─── Listo ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Todos los patches aplicados. ===" -ForegroundColor Cyan
Write-Host "Reiniciá el dev server (pnpm dev) para verificar." -ForegroundColor Yellow
Write-Host ""
