$root = "C:\CORE\apps\core-market\src\app"
$layout = "$root\admin\components\AdminLayout.tsx"
$routes = "$root\routes.tsx"

# --- AdminLayout.tsx: agregar entrada en adminMenu ---
$lContent = [System.IO.File]::ReadAllText($layout, [System.Text.Encoding]::UTF8)

$oldMenu = '    { path: "/admin/ml",        label: "' + [char]0xD83D + [char]0xDFE1 + ' MercadoLibre" },'
$newMenu = $oldMenu + [char]10 + '    { path: "/admin/api-vault", label: "' + [char]0xD83D + [char]0xDD11 + ' API Vault" },'

if ($lContent.Contains("/admin/api-vault")) {
    Write-Host "SKIP  AdminLayout.tsx (ya integrado)" -ForegroundColor DarkYellow
} elseif (-not $lContent.Contains("/admin/ml")) {
    Write-Host "ERROR AdminLayout.tsx: no se encontro la linea de ml" -ForegroundColor Red
} else {
    $lContent = $lContent.Replace($oldMenu, $newMenu)
    [System.IO.File]::WriteAllText($layout, $lContent, [System.Text.Encoding]::UTF8)
    Write-Host "OK    AdminLayout.tsx" -ForegroundColor Green
}

# --- routes.tsx: agregar import y ruta ---
$rContent = [System.IO.File]::ReadAllText($routes, [System.Text.Encoding]::UTF8)

$oldImport = 'import AdminEditor             from "./admin/editor/EditorPage";'
$newImport = $oldImport + [char]10 + 'import AdminApiVault           from "./admin/pages/AdminApiVault";'

$oldRoute = '      { id: "admin-ml",             path: "ml",            Component: AdminML },'
$newRoute = $oldRoute + [char]10 + '      { id: "admin-api-vault",      path: "api-vault",     Component: AdminApiVault },'

if ($rContent.Contains("AdminApiVault")) {
    Write-Host "SKIP  routes.tsx (ya integrado)" -ForegroundColor DarkYellow
} else {
    if (-not $rContent.Contains($oldImport)) {
        Write-Host "ERROR routes.tsx: no se encontro la linea de AdminEditor import" -ForegroundColor Red
    } else {
        $rContent = $rContent.Replace($oldImport, $newImport)
        $rContent = $rContent.Replace($oldRoute, $newRoute)
        [System.IO.File]::WriteAllText($routes, $rContent, [System.Text.Encoding]::UTF8)
        Write-Host "OK    routes.tsx" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Listo. Reinicia vite si esta corriendo." -ForegroundColor Cyan
