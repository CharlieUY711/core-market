# fix-design-tokens.ps1
# Actualiza el objeto S en designSystem.js con los tokens de CORE Market:
# - Fuente Calibri (en vez de SF Mono/monospace)
# - Colores #0D2B55, #1A4F9C, #C9A84C (en vez de teal #00d4aa y negro #111)
# - Textos mas grandes y oscuros
# - Canvas con overflow:hidden (la imagen no modifica el tamaño de la app)
# - Panel derecho mas angosto (280px)
# - Tabs y labels mas legibles

$ErrorActionPreference = "Stop"
$FILE = "C:\CORE\apps\core-market\src\lib\tool-editor\src\design\designSystem.js"
if (-not (Test-Path $FILE)) { Write-Error "No se encontro: $FILE" }

$c = Get-Content $FILE -Raw -Encoding UTF8

# ── 1. root: fuente Calibri, fondo gris CORE, overflow hidden ─────────────────
$c = $c -replace `
  'root:\s+\{ display:"flex", flexDirection:"column", height:"100%",\s+background:"#f0efea", color:"#222",\s+fontFamily:"''SF Mono'',''Fira Code'',monospace",\s+fontSize:12, overflow:"hidden" \}', `
  'root:          { display:"flex", flexDirection:"column", height:"100%",
                   background:"#F2F5FA", color:"#0D2B55",
                   fontFamily:"Calibri, ''Segoe UI'', system-ui, sans-serif",
                   fontSize:13, overflow:"hidden" }'

# ── 2. topbar: fondo oscuro CORE, texto blanco ────────────────────────────────
$c = $c -replace `
  'topbar:\s+\{ height:46, background:"#fff",\s+borderBottom:"1px solid #e0ddd5",\s+display:"flex", alignItems:"center",\s+gap:4, padding:"0 8px", flexShrink:0,\s+boxShadow:"0 1px 0 rgba\(0,0,0,\.04\)" \}', `
  'topbar:        { height:44, background:"#0D2B55",
                   borderBottom:"1px solid #081C38",
                   display:"flex", alignItems:"center",
                   gap:4, padding:"0 8px", flexShrink:0,
                   boxShadow:"0 2px 8px rgba(13,43,85,.14)" }'

# ── 3. logo: color blanco sobre fondo oscuro ──────────────────────────────────
$c = $c -replace `
  'logo:\s+\{ fontSize:13, fontWeight:700, letterSpacing:2,\s+color:"#111", padding:"0 14px",\s+borderRight:"1px solid #e0ddd5" \}', `
  'logo:          { fontSize:13, fontWeight:700, letterSpacing:2,
                   color:"#fff", padding:"0 14px",
                   borderRight:"1px solid rgba(255,255,255,.12)" }'

# ── 4. logoAccent: dorado CORE ────────────────────────────────────────────────
$c = $c -replace 'logoAccent:\s+\{ color:"#00d4aa" \}', `
  'logoAccent:    { color:"#C9A84C" }'

# ── 5. tbGroup: separador sutil sobre fondo oscuro ───────────────────────────
$c = $c -replace `
  'tbGroup:\s+\{ display:"flex", alignItems:"center", gap:2,\s+padding:"0 8px", borderRight:"1px solid #e0ddd5" \}', `
  'tbGroup:       { display:"flex", alignItems:"center", gap:2,
                   padding:"0 8px", borderRight:"1px solid rgba(255,255,255,.12)" }'

# ── 6. tbBtn: texto blanco/gris claro sobre fondo oscuro ─────────────────────
$c = $c -replace `
  'tbBtn:\s+\{ background:"none", border:"none", color:"#666",\s+padding:"4px 9px", borderRadius:4,\s+cursor:"pointer", fontSize:11, fontFamily:"inherit" \}', `
  'tbBtn:         { background:"none", border:"none", color:"rgba(255,255,255,.7)",
                   padding:"4px 9px", borderRadius:4,
                   cursor:"pointer", fontSize:11, fontFamily:"inherit" }'

# ── 7. tbBtnAccent: dorado CORE ───────────────────────────────────────────────
$c = $c -replace 'tbBtnAccent:\s+\{ background:"#00d4aa", color:"#fff" \}', `
  'tbBtnAccent:   { background:"#C9A84C", color:"#fff" }'

# ── 8. btnPrimary: azul CORE en vez de negro ──────────────────────────────────
$c = $c -replace `
  'btnPrimary:\s+\{ background:"#111", color:"#fff", border:"none",\s+borderRadius:4, padding:"5px 12px",\s+cursor:"pointer", fontSize:11, fontFamily:"inherit" \}', `
  'btnPrimary:    { background:"#1A4F9C", color:"#fff", border:"none",
                   borderRadius:4, padding:"5px 12px",
                   cursor:"pointer", fontSize:11, fontFamily:"inherit",
                   fontWeight:600, letterSpacing:"0.05em" }'

# ── 9. btnAccent: dorado CORE ─────────────────────────────────────────────────
$c = $c -replace 'btnAccent:\s+\{ background:"#00d4aa", marginLeft:4 \}', `
  'btnAccent:     { background:"#C9A84C", marginLeft:4 }'

# ── 10. canvasWrap: overflow hidden — la imagen nunca expande el layout ────────
$c = $c -replace `
  'canvasWrap:\s+\{ flex:1, background:"#e8e6e0",\s+display:"flex", alignItems:"center",\s+justifyContent:"center",\s+position:"relative", overflow:"auto" \}', `
  'canvasWrap:    { flex:1, background:"#E8EDF5",
                   display:"flex", alignItems:"center",
                   justifyContent:"center",
                   position:"relative", overflow:"hidden" }'

# ── 11. rightPanel: 280px, borde CORE ────────────────────────────────────────
$c = $c -replace `
  'rightPanel:\s+\{ width:320, background:"#fff",\s+borderLeft:"1px solid #e0ddd5",\s+display:"flex", flexDirection:"column",\s+flexShrink:0, overflow:"hidden" \}', `
  'rightPanel:    { width:280, background:"#fff",
                   borderLeft:"1px solid #C8D5E8",
                   display:"flex", flexDirection:"column",
                   flexShrink:0, overflow:"hidden" }'

# ── 12. panelTabs: borde CORE ────────────────────────────────────────────────
$c = $c -replace `
  'panelTabs:\s+\{ display:"flex", borderBottom:"1px solid #e0ddd5",\s+flexShrink:0 \}', `
  'panelTabs:     { display:"flex", borderBottom:"1px solid #C8D5E8",
                   background:"#F2F5FA", flexShrink:0 }'

# ── 13. ptab: mas grande, color CORE ─────────────────────────────────────────
$c = $c -replace `
  'ptab:\s+\{ flex:1, background:"none", border:"none", color:"#bbb",\s+padding:"8px 2px", cursor:"pointer", fontSize:9,\s+letterSpacing:\.5, textTransform:"uppercase",\s+borderBottom:"2px solid transparent",\s+transition:"all \.15s" \}', `
  'ptab:          { flex:1, background:"none", border:"none", color:"#7A7A7A",
                   padding:"9px 2px", cursor:"pointer", fontSize:10,
                   fontWeight:600, letterSpacing:.5, textTransform:"uppercase",
                   borderBottom:"2px solid transparent",
                   transition:"all .15s" }'

# ── 14. ptabActive: azul CORE ────────────────────────────────────────────────
$c = $c -replace 'ptabActive:\s+\{ color:"#00d4aa", borderBottomColor:"#00d4aa" \}', `
  'ptabActive:    { color:"#1A4F9C", borderBottomColor:"#1A4F9C", background:"#fff" }'

# ── 15. applyBtn: azul CORE ──────────────────────────────────────────────────
$c = $c -replace `
  'applyBtn:\s+\{ width:"100%", background:"#111", color:"#fff",\s+border:"none", borderRadius:4, padding:7,\s+cursor:"pointer", fontSize:11, fontFamily:"inherit" \}', `
  'applyBtn:      { width:"100%", background:"#1A4F9C", color:"#fff",
                   border:"none", borderRadius:4, padding:7,
                   cursor:"pointer", fontSize:11, fontFamily:"inherit",
                   fontWeight:600 }'

# ── 16. applyBtnGhost: borde CORE ────────────────────────────────────────────
$c = $c -replace `
  'applyBtnGhost: \{ background:"#f5f5f3", color:"#888",\s+border:"1px solid #e0ddd5" \}', `
  'applyBtnGhost: { background:"transparent", color:"#7A7A7A",
                   border:"1px solid #C8D5E8" }'

# ── 17. outBtnActive: azul CORE ──────────────────────────────────────────────
$c = $c -replace `
  'outBtnActive:\s+\{ background:"#111", borderColor:"#111", color:"#fff" \}', `
  'outBtnActive:  { background:"#1A4F9C", borderColor:"#1A4F9C", color:"#fff" }'

# ── 18. toolActive: azul CORE ────────────────────────────────────────────────
$c = $c -replace 'toolActive:\s+\{ background:"#111", color:"#fff" \}', `
  'toolActive:    { background:"#1A4F9C", color:"#fff" }'

# ── 19. statusbar: borde y texto CORE ────────────────────────────────────────
$c = $c -replace `
  'statusbar:\s+\{ height:36, background:"#fff",\s+borderTop:"1px solid #e0ddd5",\s+display:"flex", alignItems:"center",\s+padding:"0 14px", gap:16, flexShrink:0 \}', `
  'statusbar:     { height:32, background:"#F2F5FA",
                   borderTop:"1px solid #C8D5E8",
                   display:"flex", alignItems:"center",
                   padding:"0 14px", gap:16, flexShrink:0 }'

# ── 20. toolsPanel: borde CORE ───────────────────────────────────────────────
$c = $c -replace `
  'toolsPanel:\s+\{ width:69, background:"#fff",\s+borderRight:"1px solid #e0ddd5",\s+display:"flex", flexDirection:"column",\s+alignItems:"center", padding:"8px 0",\s+gap:2, flexShrink:0 \}', `
  'toolsPanel:    { width:56, background:"#fff",
                   borderRight:"1px solid #C8D5E8",
                   display:"flex", flexDirection:"column",
                   alignItems:"center", padding:"8px 0",
                   gap:2, flexShrink:0 }'

[System.IO.File]::WriteAllText($FILE, $c, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "OK  designSystem.js actualizado con tokens CORE Market" -ForegroundColor Green
Write-Host "    - Fuente: Calibri / Segoe UI" -ForegroundColor Gray
Write-Host "    - Topbar: #0D2B55 (azul oscuro CORE)" -ForegroundColor Gray
Write-Host "    - Accion: #1A4F9C (azul primario CORE)" -ForegroundColor Gray
Write-Host "    - Acento: #C9A84C (dorado CORE)" -ForegroundColor Gray
Write-Host "    - Canvas: overflow hidden (imagen no expande el layout)" -ForegroundColor Gray
Write-Host "    - Panel derecho: 280px" -ForegroundColor Gray
Write-Host "    - Tabs: 10px, bold, mas visibles" -ForegroundColor Gray
Write-Host ""
Write-Host "Vite deberia recompilar automaticamente." -ForegroundColor Cyan
