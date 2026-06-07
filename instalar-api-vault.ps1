# instalar-api-vault.ps1
# Mueve los archivos del módulo API Vault al proyecto core-market.
# Ejecutar desde PowerShell en cualquier ruta.

$source  = "C:\CORE\temp\api-vault-core-market"
$target  = "C:\CORE\core-market"

Write-Host ""
Write-Host "=== API Vault — Instalación en core-market ===" -ForegroundColor Cyan
Write-Host "  Origen : $source"
Write-Host "  Destino: $target"
Write-Host ""

# Verificar que existen ambas rutas
if (-not (Test-Path $source)) {
    Write-Host "ERROR: No se encuentra la carpeta origen: $source" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $target)) {
    Write-Host "ERROR: No se encuentra el proyecto en: $target" -ForegroundColor Red
    exit 1
}

# Mapa de archivos: origen relativo → destino relativo dentro de core-market
$files = @(
    @{
        from = "src\app\admin\services\apiVaultTypes.ts"
        to   = "src\app\admin\services\apiVaultTypes.ts"
    },
    @{
        from = "src\app\admin\services\apiVaultService.ts"
        to   = "src\app\admin\services\apiVaultService.ts"
    },
    @{
        from = "src\app\admin\hooks\useApiVault.ts"
        to   = "src\app\admin\hooks\useApiVault.ts"
    },
    @{
        from = "src\app\admin\pages\AdminApiVault.tsx"
        to   = "src\app\admin\pages\AdminApiVault.tsx"
    },
    @{
        from = "supabase\migrations\20260607_api_vault.sql"
        to   = "supabase\migrations\20260607_api_vault.sql"
    },
    @{
        from = "INTEGRACION.md"
        to   = "INTEGRACION_API_VAULT.md"
    }
)

$ok    = 0
$skipped = 0

foreach ($f in $files) {
    $srcPath = Join-Path $source $f.from
    $dstPath = Join-Path $target $f.to
    $dstDir  = Split-Path $dstPath -Parent

    if (-not (Test-Path $srcPath)) {
        Write-Host "  FALTA   $($f.from)" -ForegroundColor Yellow
        $skipped++
        continue
    }

    # Crear carpeta destino si no existe
    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        Write-Host "  CREADA  $dstDir" -ForegroundColor DarkGray
    }

    # Advertir si el archivo ya existe (no sobreescribe sin confirmación)
    if (Test-Path $dstPath) {
        $resp = Read-Host "  Ya existe $($f.to). ¿Sobreescribir? [s/N]"
        if ($resp -notin @("s","S","si","Si","SI","y","Y")) {
            Write-Host "  OMITIDO $($f.to)" -ForegroundColor DarkYellow
            $skipped++
            continue
        }
    }

    Copy-Item -Path $srcPath -Destination $dstPath -Force
    Write-Host "  OK      $($f.to)" -ForegroundColor Green
    $ok++
}

Write-Host ""
Write-Host "Resultado: $ok archivo(s) copiado(s), $skipped omitido(s)." -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor White
Write-Host "  1. Ejecutar supabase\migrations\20260607_api_vault.sql en el SQL Editor de Supabase"
Write-Host "  2. Agregar la ruta en src\app\App.tsx"
Write-Host "  3. Agregar el link en el sidebar de admin"
Write-Host "  4. Ver instrucciones completas en INTEGRACION_API_VAULT.md"
Write-Host ""
