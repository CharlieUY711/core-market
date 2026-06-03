# CORE Market — Navbar Patch
# 1. Nuevo logo [m] MARKET by CORE
# 2. Botón toggle en navbar
# 3. Eliminar barra de modo fixed

$file = "C:\CORE\apps\core-market\src\app\public\CoreStorefront.tsx"
$content = Get-Content $file -Raw

# ── CAMBIO 1: Reemplazar logo + span por nuevo logo con toggle ────────────────
$oldLogo = @'
          <div className="core-header-left">
            <div className="core-logo">
              <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
                {/* Hexágonos interconectados - tres hexágonos: dos abajo, uno arriba centrado */}
                <g fill="none" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" transform="translate(0, 5)">
                  {/* Hexágono superior (centrado) */}
                  <path d="M 100 10 L 130 25 L 130 55 L 100 70 L 70 55 L 70 25 Z" />
                  {/* Hexágono inferior izquierdo */}
                  <path d="M 70 55 L 100 70 L 100 100 L 70 115 L 40 100 L 40 70 Z" />
                  {/* Hexágono inferior derecho */}
                  <path d="M 130 55 L 160 70 L 160 100 L 130 115 L 100 100 L 100 70 Z" />
                </g>
              </svg>
            </div>

            <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', minWidth: '140px', display: 'inline-block', textAlign: 'center' }}>
              {isSH ? 'Second Hand' : 'Market'}
            </span>
          </div>

          <div className="core-search">
            <input type="text" placeholder="encontra lo que buscas" />
          </div>
'@

$newLogo = @'
          <div className="core-header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Logo [m] MARKET by CORE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <div style={{
                width: '32px', height: '32px',
                background: 'rgba(255,255,255,.15)',
                border: '1.5px solid rgba(255,255,255,.3)',
                borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1rem', color: '#fff',
                fontFamily: "Calibri, 'Segoe UI', sans-serif",
                flexShrink: 0
              }}>m</div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{
                  color: '#fff', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.08em',
                  fontFamily: "Calibri, 'Segoe UI', sans-serif", textTransform: 'uppercase'
                }}>MARKET</span>
                <span style={{
                  color: 'rgba(255,255,255,.5)', fontWeight: 400, fontSize: '0.6rem', letterSpacing: '0.12em',
                  fontFamily: "Calibri, 'Segoe UI', sans-serif", textTransform: 'uppercase'
                }}>by CORE</span>
              </div>
            </div>

            {/* Toggle button */}
            <button
              onClick={() => toggleMode()}
              style={{
                padding: '5px 12px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "Calibri, 'Segoe UI', sans-serif",
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'all 200ms ease',
                background: isSH ? '#1A4F9C' : '#1D9E75',
                color: '#fff',
                flexShrink: 0,
                minWidth: '80px'
              }}
            >
              {isSH ? 'MARKET' : 'SECOND'}
            </button>
          </div>

          <div className="core-search" style={{ border: 'none' }}>
            <input type="text" placeholder="encontra lo que buscas" style={{ border: 'none', outline: 'none' }} />
          </div>
'@

$content = $content.Replace($oldLogo, $newLogo)

# ── CAMBIO 2: Eliminar barra de modo fixed (div con greenBarRef) ──────────────
$oldBar = @'
        {/* Barra de modo */}
        <div ref={greenBarRef} style={{ position: 'fixed', top: headerHeight + 20, left: 0, right: 0, width: '100%',
height: '48px', backgroundColor: isSH ? '#FF6835' : '#6BB87A', transition: 'background-color 0.4s ease', zIndex: 299,
display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '12px', paddingRight: '12px' }}>
'@

# Find and remove the green bar div - mark it as hidden instead to avoid breaking refs
$content = $content -replace '(?s)\{/\* Barra de modo \*/\}\s*<div ref=\{greenBarRef\}[^>]+>.*?</div>', '{/* Barra de modo eliminada v2.0 */}'

# ── CAMBIO 3: Arreglar color del contador del carrito (quitar naranja) ─────────
$content = $content -replace "color: isSH \? '#6BB87A' : '#FF6835'", "color: isSH ? '#1D9E75' : '#C9A84C'"

# ── GUARDAR ───────────────────────────────────────────────────────────────────
Set-Content $file $content -Encoding UTF8
Write-Host "PATCH APLICADO"
