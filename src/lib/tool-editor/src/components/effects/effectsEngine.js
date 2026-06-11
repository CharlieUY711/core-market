/**
 * CoreEditor — Effects Engine
 * Repositorio: CharlieUY711/core-tool-editor
 * Path local:  C:\Core\tools\core-editor\src\components\effects\effectsEngine.js
 *
 * Módulo puro (sin React). Todas las funciones reciben/devuelven canvas o ImageData.
 *
 * Exporta:
 *   applyBoxBlur(canvas, radius)
 *   applyGaussianBlur(canvas, radius)
 *   applyTiltShift(canvas, focusY, blurStrength, bandHeight)
 *   applyPixelate(canvas, blockSize)
 *   applyPixelateRegion(canvas, x, y, w, h, blockSize)   ← para censurar caras
 *   applyWatermarkVisible(canvas, opts)
 *   applyWatermarkInvisible(canvas, message, key)         ← esteganografía LSB
 *   readWatermarkInvisible(canvas, key)                   ← leer marca oculta
 */

// ─── BLUR ─────────────────────────────────────────────────────────────────────

/**
 * Box blur simple — O(W*H*radius). Rápido para previews.
 * @param {HTMLCanvasElement} canvas
 * @param {number} radius  1-50
 */
export function applyBoxBlur(canvas, radius) {
  const ctx  = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const src  = new Uint8ClampedArray(data.data);
  const d    = data.data;
  const W    = canvas.width, H = canvas.height;
  const r    = Math.max(1, Math.round(radius));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let rS=0, gS=0, bS=0, aS=0, cnt=0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = Math.min(W-1, Math.max(0, x+dx));
          const ny = Math.min(H-1, Math.max(0, y+dy));
          const i  = (ny*W + nx)*4;
          rS += src[i]; gS += src[i+1]; bS += src[i+2]; aS += src[i+3];
          cnt++;
        }
      }
      const o = (y*W + x)*4;
      d[o]   = rS/cnt; d[o+1] = gS/cnt; d[o+2] = bS/cnt; d[o+3] = aS/cnt;
    }
  }
  ctx.putImageData(data, 0, 0);
}

/**
 * Gaussian blur mediante dos pasadas separables (horizontal + vertical).
 * Mucho más rápido que el kernel 2D completo. O(W*H*(2r+1)).
 * @param {HTMLCanvasElement} canvas
 * @param {number} radius  1-80
 */
export function applyGaussianBlur(canvas, radius) {
  const ctx  = canvas.getContext("2d");
  const W    = canvas.width, H = canvas.height;
  const r    = Math.max(1, Math.round(radius));

  // Construir kernel gaussiano 1D
  const size   = 2*r + 1;
  const kernel = new Float32Array(size);
  const sigma  = r / 2.5;
  let   sum    = 0;
  for (let i = 0; i < size; i++) {
    const x     = i - r;
    kernel[i]   = Math.exp(-(x*x) / (2*sigma*sigma));
    sum        += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;

  const orig = ctx.getImageData(0, 0, W, H);
  const src  = new Uint8ClampedArray(orig.data);
  const tmp  = new Uint8ClampedArray(W*H*4);
  const dst  = new Uint8ClampedArray(W*H*4);

  // Pasada horizontal
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let rS=0, gS=0, bS=0, aS=0;
      for (let k = 0; k < size; k++) {
        const nx = Math.min(W-1, Math.max(0, x + k - r));
        const i  = (y*W + nx)*4;
        rS += src[i]*kernel[k]; gS += src[i+1]*kernel[k];
        bS += src[i+2]*kernel[k]; aS += src[i+3]*kernel[k];
      }
      const o = (y*W + x)*4;
      tmp[o]=rS; tmp[o+1]=gS; tmp[o+2]=bS; tmp[o+3]=aS;
    }
  }

  // Pasada vertical
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let rS=0, gS=0, bS=0, aS=0;
      for (let k = 0; k < size; k++) {
        const ny = Math.min(H-1, Math.max(0, y + k - r));
        const i  = (ny*W + x)*4;
        rS += tmp[i]*kernel[k]; gS += tmp[i+1]*kernel[k];
        bS += tmp[i+2]*kernel[k]; aS += tmp[i+3]*kernel[k];
      }
      const o = (y*W + x)*4;
      dst[o]=rS; dst[o+1]=gS; dst[o+2]=bS; dst[o+3]=aS;
    }
  }

  const out = ctx.createImageData(W, H);
  out.data.set(dst);
  ctx.putImageData(out, 0, 0);
}

/**
 * Tilt-shift: enfoque simulado. Solo las filas cercanas a focusY quedan nítidas.
 * @param {HTMLCanvasElement} canvas
 * @param {number} focusY       0.0-1.0 — posición vertical del foco (porcentaje)
 * @param {number} blurStrength 1-40
 * @param {number} bandHeight   0.05-0.5 — ancho de la banda nítida (porcentaje)
 */
export function applyTiltShift(canvas, focusY=0.5, blurStrength=20, bandHeight=0.15) {
  const ctx = canvas.getContext("2d");
  const W   = canvas.width, H = canvas.height;

  // Guardar original
  const origData = ctx.getImageData(0, 0, W, H);

  // Crear versión blureada
  const blurCanvas   = document.createElement("canvas");
  blurCanvas.width   = W; blurCanvas.height = H;
  blurCanvas.getContext("2d").putImageData(origData, 0, 0);
  applyGaussianBlur(blurCanvas, blurStrength);
  const blurData = blurCanvas.getContext("2d").getImageData(0, 0, W, H);

  // Combinar: mezclar por distancia al foco
  const orig = origData.data;
  const blur = blurData.data;
  const out  = ctx.createImageData(W, H);
  const od   = out.data;
  const focPx    = focusY * H;
  const bandPx   = bandHeight * H;

  for (let y = 0; y < H; y++) {
    const dist   = Math.abs(y - focPx);
    // t=0 → nítido, t=1 → totalmente blureado
    const t      = Math.min(1, Math.max(0, (dist - bandPx/2) / (H * 0.35)));
    const smooth = t*t*(3 - 2*t); // smoothstep

    for (let x = 0; x < W; x++) {
      const i = (y*W + x)*4;
      od[i]   = orig[i]   * (1-smooth) + blur[i]   * smooth;
      od[i+1] = orig[i+1] * (1-smooth) + blur[i+1] * smooth;
      od[i+2] = orig[i+2] * (1-smooth) + blur[i+2] * smooth;
      od[i+3] = orig[i+3];
    }
  }
  ctx.putImageData(out, 0, 0);
}

// ─── PIXELADO ─────────────────────────────────────────────────────────────────

/**
 * Pixelado de toda la imagen.
 * @param {HTMLCanvasElement} canvas
 * @param {number} blockSize  2-64
 */
export function applyPixelate(canvas, blockSize) {
  const ctx = canvas.getContext("2d");
  const W   = canvas.width, H = canvas.height;
  const bs  = Math.max(2, Math.round(blockSize));
  const data = ctx.getImageData(0, 0, W, H);
  const d    = data.data;

  for (let y = 0; y < H; y += bs) {
    for (let x = 0; x < W; x += bs) {
      // Color promedio del bloque
      let rS=0, gS=0, bS=0, cnt=0;
      for (let dy=0; dy<bs && y+dy<H; dy++) {
        for (let dx=0; dx<bs && x+dx<W; dx++) {
          const i = ((y+dy)*W + (x+dx))*4;
          rS += d[i]; gS += d[i+1]; bS += d[i+2]; cnt++;
        }
      }
      const r=rS/cnt, g=gS/cnt, b=bS/cnt;
      // Pintar bloque con ese color
      for (let dy=0; dy<bs && y+dy<H; dy++) {
        for (let dx=0; dx<bs && x+dx<W; dx++) {
          const i = ((y+dy)*W + (x+dx))*4;
          d[i]=r; d[i+1]=g; d[i+2]=b;
        }
      }
    }
  }
  ctx.putImageData(data, 0, 0);
}

/**
 * Pixelado de una región rectangular (censurar caras, datos sensibles).
 * @param {HTMLCanvasElement} canvas
 * @param {number} rx, ry, rw, rh — región en píxeles del canvas real
 * @param {number} blockSize
 */
export function applyPixelateRegion(canvas, rx, ry, rw, rh, blockSize) {
  const ctx = canvas.getContext("2d");
  const W   = canvas.width, H = canvas.height;
  const bs  = Math.max(2, Math.round(blockSize));

  // Extraer solo la región
  const region = ctx.getImageData(rx, ry, rw, rh);
  const d      = region.data;
  const RW     = region.width, RH = region.height;

  for (let y = 0; y < RH; y += bs) {
    for (let x = 0; x < RW; x += bs) {
      let rS=0, gS=0, bS=0, cnt=0;
      for (let dy=0; dy<bs && y+dy<RH; dy++) {
        for (let dx=0; dx<bs && x+dx<RW; dx++) {
          const i = ((y+dy)*RW + (x+dx))*4;
          rS+=d[i]; gS+=d[i+1]; bS+=d[i+2]; cnt++;
        }
      }
      const r=rS/cnt, g=gS/cnt, b=bS/cnt;
      for (let dy=0; dy<bs && y+dy<RH; dy++) {
        for (let dx=0; dx<bs && x+dx<RW; dx++) {
          const i = ((y+dy)*RW + (x+dx))*4;
          d[i]=r; d[i+1]=g; d[i+2]=b;
        }
      }
    }
  }
  ctx.putImageData(region, rx, ry);
}

// ─── MARCA DE AGUA VISIBLE ───────────────────────────────────────────────────

/**
 * Dibuja marca de agua de texto visible sobre el canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 *   text        — texto de la marca
 *   position    — "center" | "bottomRight" | "bottomLeft" | "topRight" | "topLeft" | "tile"
 *   opacity     — 0.0-1.0
 *   fontSize    — px (auto si 0)
 *   color       — hex "#ffffff"
 *   rotation    — grados (default -35 para diagonal)
 *   fontFamily  — default "Arial"
 *   padding     — margen desde el borde en tile/corner (px)
 */
export function applyWatermarkVisible(canvas, opts = {}) {
  const {
    text       = "© CoreEditor",
    position   = "bottomRight",
    opacity    = 0.35,
    fontSize   = 0,
    color      = "#ffffff",
    rotation   = -35,
    fontFamily = "Arial, sans-serif",
    padding    = 24,
  } = opts;

  const ctx = canvas.getContext("2d");
  const W   = canvas.width, H = canvas.height;

  // Tamaño automático: ~3% del lado menor
  const fs  = fontSize > 0 ? fontSize : Math.max(16, Math.round(Math.min(W,H) * 0.03));

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle   = color;
  ctx.font        = `bold ${fs}px ${fontFamily}`;
  ctx.textBaseline= "middle";

  if (position === "tile") {
    // Repetición en diagonal por toda la imagen
    const step = fs * 8;
    ctx.save();
    // Shadow suave para legibilidad sobre cualquier fondo
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur  = 4;
    for (let y = -H; y < H*2; y += step) {
      for (let x = -W; x < W*2; x += step) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  } else {
    // Posiciones fijas con shadow
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur  = 6;
    const tw = ctx.measureText(text).width;

    let tx, ty;
    switch (position) {
      case "center":      tx = W/2 - tw/2;       ty = H/2; break;
      case "bottomRight": tx = W - tw - padding;  ty = H - padding; break;
      case "bottomLeft":  tx = padding;            ty = H - padding; break;
      case "topRight":    tx = W - tw - padding;  ty = padding + fs/2; break;
      case "topLeft":     tx = padding;            ty = padding + fs/2; break;
      default:            tx = W/2 - tw/2;         ty = H/2;
    }

    if (position !== "center") {
      ctx.fillText(text, tx, ty);
    } else {
      ctx.save();
      ctx.translate(W/2, H/2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.fillText(text, -tw/2, 0);
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Aplica marca de agua de imagen (logo PNG) sobre el canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement}  logoImg
 * @param {object} opts  { position, opacity, scale, padding }
 */
export function applyWatermarkLogo(canvas, logoImg, opts = {}) {
  const { position="bottomRight", opacity=0.5, scale=0.15, padding=20 } = opts;
  const ctx = canvas.getContext("2d");
  const W   = canvas.width, H = canvas.height;
  const lw  = Math.round(Math.min(W,H) * scale);
  const lh  = Math.round((logoImg.height / logoImg.width) * lw);

  let x, y;
  switch (position) {
    case "bottomRight": x=W-lw-padding; y=H-lh-padding; break;
    case "bottomLeft":  x=padding;      y=H-lh-padding; break;
    case "topRight":    x=W-lw-padding; y=padding;       break;
    case "topLeft":     x=padding;      y=padding;       break;
    default:            x=W/2-lw/2;     y=H/2-lh/2;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(logoImg, x, y, lw, lh);
  ctx.restore();
}

// ─── MARCA DE AGUA INVISIBLE (Esteganografía LSB) ────────────────────────────
/**
 * Codifica un mensaje de texto en los bits menos significativos (LSB) del canal rojo.
 * El mensaje es completamente invisible al ojo humano.
 *
 * Capacidad: floor(W*H / 8) caracteres máximo.
 *
 * Esquema:
 *   - Primeros 32 píxeles → longitud del mensaje (uint32, LSB del canal R)
 *   - Siguientes N*8 píxeles → bits del mensaje en UTF-8
 *   - Si se provee key, se aplica XOR con PRNG seeded por key antes de codificar
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} message   Texto a ocultar
 * @param {string} key       Clave para cifrado XOR (opcional)
 * @returns {{ ok: boolean, capacity: number, used: number }}
 */
export function applyWatermarkInvisible(canvas, message, key = "") {
  const ctx  = canvas.getContext("2d");
  const W    = canvas.width, H = canvas.height;
  const data = ctx.getImageData(0, 0, W, H);
  const d    = data.data;
  const cap  = Math.floor((W * H) / 8);

  // Convertir mensaje a bytes UTF-8
  const encoder = new TextEncoder();
  let   msgBytes = encoder.encode(message);

  if (msgBytes.length > cap - 4) {
    return { ok: false, capacity: cap - 4, used: msgBytes.length,
             error: `Mensaje demasiado largo. Máximo ${cap-4} bytes.` };
  }

  // Cifrado XOR con PRNG si hay key
  if (key) {
    msgBytes = xorWithKey(msgBytes, key);
  }

  // Construir stream de bits: [longitud 32bits][mensaje]
  const bits = [];

  // Longitud como uint32 big-endian → 32 bits
  const len = msgBytes.length;
  for (let b = 31; b >= 0; b--) bits.push((len >> b) & 1);

  // Bytes del mensaje
  for (const byte of msgBytes) {
    for (let b = 7; b >= 0; b--) bits.push((byte >> b) & 1);
  }

  // Escribir bits en LSB del canal R de cada píxel
  for (let i = 0; i < bits.length; i++) {
    const px = i * 4; // canal R del píxel i
    d[px] = (d[px] & 0xFE) | bits[i]; // limpiar LSB y poner el bit
  }

  ctx.putImageData(data, 0, 0);
  return { ok: true, capacity: cap - 4, used: msgBytes.length };
}

/**
 * Lee y decodifica el mensaje oculto en el canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {string} key  Misma clave usada al codificar
 * @returns {{ ok: boolean, message: string, error?: string }}
 */
export function readWatermarkInvisible(canvas, key = "") {
  const ctx  = canvas.getContext("2d");
  const W    = canvas.width, H = canvas.height;
  const data = ctx.getImageData(0, 0, W, H);
  const d    = data.data;
  const total = W * H;

  // Leer primeros 32 bits → longitud
  let len = 0;
  for (let i = 0; i < 32; i++) {
    len = (len << 1) | (d[i*4] & 1);
  }

  if (len <= 0 || len > total/8 - 4) {
    return { ok: false, error: "No se encontró marca de agua o imagen incorrecta" };
  }

  // Leer len*8 bits a partir del bit 32
  const msgBytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      const bitIdx = 32 + i*8 + b;
      byte = (byte << 1) | (d[bitIdx*4] & 1);
    }
    msgBytes[i] = byte;
  }

  // Descifrar XOR si hay key
  const finalBytes = key ? xorWithKey(msgBytes, key) : msgBytes;

  try {
    const decoder = new TextDecoder();
    return { ok: true, message: decoder.decode(finalBytes) };
  } catch {
    return { ok: false, error: "Error al decodificar. Clave incorrecta o sin marca." };
  }
}

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * PRNG determinista (mulberry32) seeded por hash de string.
 * Produce la misma secuencia de bytes para la misma key.
 */
function hashKey(key) {
  let h = 0x9e3779b9;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i) + 0x6d2b79f5 + (h<<6) + (h>>2);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed>>>15, 1 | seed);
    t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t;
    return ((t ^ t>>>14) >>> 0) / 4294967296;
  };
}

function xorWithKey(bytes, key) {
  const rng    = mulberry32(hashKey(key));
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ Math.floor(rng() * 256);
  }
  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOVIDO DESDE ToolEditor.jsx — Capa 1: Funcionalidad
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Aplica todos los ajustes de imagen en píxeles.
 * Exposición, contraste, brillo, sombras, altas luces,
 * temperatura, tinte, saturación, nitidez, claridad, ruido, viñeta.
 */
export function applyPixelAdjustments(imageData, adj) {
  const d   = imageData.data;
  const W   = imageData.width;
  const H   = imageData.height;
  const exp = adj.exposure    / 100;
  const con = (adj.contrast   + 100) / 100;
  const bri = adj.brightness  / 100;
  const sha = adj.shadows     / 100;
  const hig = adj.highlights  / 100;
  const sat = (adj.saturation + 100) / 100;
  const tmp = adj.temperature / 100;
  const tnt = adj.tint        / 100;
  const vig = adj.vignette    / 100;
  const noi = adj.noise       / 100;
  const cxv = W / 2, cyv = H / 2;
  const maxD = Math.sqrt(cxv*cxv + cyv*cyv);

  let src = null;
  if (adj.sharpness > 0 || adj.clarity !== 0) src = new Uint8ClampedArray(d);

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i+1], b = d[i+2];
    // Exposure
    r = Math.min(255, r*(1+exp)); g = Math.min(255, g*(1+exp)); b = Math.min(255, b*(1+exp));
    // Contrast
    r = Math.min(255,Math.max(0,((r/255-0.5)*con+0.5)*255));
    g = Math.min(255,Math.max(0,((g/255-0.5)*con+0.5)*255));
    b = Math.min(255,Math.max(0,((b/255-0.5)*con+0.5)*255));
    // Brightness
    r = Math.min(255,Math.max(0,r+bri*255));
    g = Math.min(255,Math.max(0,g+bri*255));
    b = Math.min(255,Math.max(0,b+bri*255));
    // Shadows / Highlights
    const lum = (r*0.299+g*0.587+b*0.114)/255;
    const sBoost = sha*Math.max(0,1-lum*2)*80;
    const hBoost = hig*Math.max(0,lum*2-1)*80;
    r = Math.min(255,Math.max(0,r+sBoost+hBoost));
    g = Math.min(255,Math.max(0,g+sBoost+hBoost));
    b = Math.min(255,Math.max(0,b+sBoost+hBoost));
    // Temperature / Tint
    r = Math.min(255,Math.max(0,r+tmp*35)); b = Math.min(255,Math.max(0,b-tmp*35));
    g = Math.min(255,Math.max(0,g+tnt*20));
    // Saturation
    const gray = r*0.299+g*0.587+b*0.114;
    r = Math.min(255,Math.max(0,gray+(r-gray)*sat));
    g = Math.min(255,Math.max(0,gray+(g-gray)*sat));
    b = Math.min(255,Math.max(0,gray+(b-gray)*sat));
    // Noise
    if (noi > 0) {
      const px=(i/4)%W, py=Math.floor(i/4/W);
      const grain=(((px*1234+py*5678)%256)/256-0.5)*noi*60;
      r=Math.min(255,Math.max(0,r+grain));
      g=Math.min(255,Math.max(0,g+grain));
      b=Math.min(255,Math.max(0,b+grain));
    }
    // Vignette
    if (vig !== 0) {
      const px=(i/4)%W, py=Math.floor(i/4/W);
      const dist=Math.sqrt((px-cxv)**2+(py-cyv)**2)/maxD;
      const v=vig>0?1-dist*vig:1+dist*(-vig)*0.5;
      r=Math.min(255,Math.max(0,r*v)); g=Math.min(255,Math.max(0,g*v)); b=Math.min(255,Math.max(0,b*v));
    }
    d[i]=r; d[i+1]=g; d[i+2]=b;
  }
  // Sharpness — unsharp mask 3x3
  if (src && adj.sharpness > 0) {
    const str = adj.sharpness/100;
    for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++) {
      const c=(y*W+x)*4;
      for (let ch=0;ch<3;ch++) {
        const blur=(src[(y-1)*W*4+x*4+ch]+src[(y+1)*W*4+x*4+ch]+src[y*W*4+(x-1)*4+ch]+src[y*W*4+(x+1)*4+ch])/4;
        d[c+ch]=Math.min(255,Math.max(0,d[c+ch]+(d[c+ch]-blur)*str*2));
      }
    }
  }
  // Clarity — micro-contraste local
  if (src && adj.clarity !== 0) {
    const str = adj.clarity/100;
    for (let y=2;y<H-2;y++) for (let x=2;x<W-2;x++) {
      const c=(y*W+x)*4;
      for (let ch=0;ch<3;ch++) {
        const local=(src[(y-2)*W*4+x*4+ch]+src[(y+2)*W*4+x*4+ch]+src[y*W*4+(x-2)*4+ch]+src[y*W*4+(x+2)*4+ch])/4;
        d[c+ch]=Math.min(255,Math.max(0,d[c+ch]+(d[c+ch]-local)*str*1.5));
      }
    }
  }
  return imageData;
}

/**
 * Hornea un filtro CSS en los píxeles reales del canvas.
 * Necesario para que el filtro aparezca en la exportación.
 */
export function bakeFilterToPixels(canvas, filterCSS) {
  if (!filterCSS || filterCSS === "none") return;
  const tmp = document.createElement("canvas");
  tmp.width = canvas.width; tmp.height = canvas.height;
  const tc = tmp.getContext("2d");
  tc.filter = filterCSS;
  tc.drawImage(canvas, 0, 0);
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  canvas.getContext("2d").drawImage(tmp, 0, 0);
}

/**
 * Estima el tamaño del archivo de salida según dimensiones, formato y calidad.
 */
export function estimateFileSize(w, h, format, quality) {
  const bpp  = format === "png" ? 4 : format === "webp" ? 1.5 : 1;
  const base = w * h * bpp * (format === "jpeg" ? quality/100 : 1);
  const kb   = Math.round(base / 1024);
  return kb > 1024 ? `~${(kb/1024).toFixed(1)} MB` : `~${kb} KB`;
}

/**
 * Remove background con IA — llama a Claude Vision, analiza el fondo
 * y aplica flood-fill BFS con suavizado de bordes.
 * @param {HTMLCanvasElement} canvas
 * @param {number} tolerance  5-80
 * @param {function} onStatus  callback(mensaje) para actualizar UI
 * @returns {{ subject: string }}
 */
export async function removeBackgroundAI(canvas, tolerance, onStatus = () => {}) {
  onStatus("Enviando a Claude Vision...");
  const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
  onStatus("Analizando sujeto principal...");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:base64 } },
          { type:"text",  text:`Analiza esta imagen. Devuelve SOLO JSON sin markdown:
{
  "subject": "descripción breve del sujeto",
  "bg_colors": [[R,G,B],[R,G,B],[R,G,B]],
  "sample_points": [[x_pct,y_pct],...],
  "tolerance": 25
}
bg_colors: colores del FONDO (no del sujeto), RGB 0-255.
sample_points: coordenadas 0.0-1.0 de píxeles que son FONDO seguro.
tolerance: 10-60 según nitidez de bordes.` }
        ]
      }]
    })
  });

  const data = await response.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  const analysis = JSON.parse(text.replace(/```json|```/g, "").trim());

  onStatus(`Sujeto: ${analysis.subject} — removiendo fondo...`);
  await smartFloodFill(canvas, analysis, tolerance);
  return { subject: analysis.subject };
}

/**
 * Flood-fill BFS inteligente usando colores detectados por IA.
 * Aplica suavizado de bordes al final.
 */
export function smartFloodFill(canvas, analysis, toleranceFallback = 30) {
  return new Promise(resolve => {
    const ctx     = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d       = imgData.data;
    const tol     = (analysis.tolerance || toleranceFallback) * 3;
    const bgColors= analysis.bg_colors || [[255,255,255]];
    const samples = (analysis.sample_points || [[0,0],[1,0],[0,1],[1,1]])
      .map(([xp,yp]) => ({ x:Math.round(xp*canvas.width), y:Math.round(yp*canvas.height) }));
    const sampledColors = samples.map(({x,y}) => {
      const i=(y*canvas.width+x)*4; return [d[i],d[i+1],d[i+2]];
    });
    const allBg   = [...bgColors, ...sampledColors];
    const visited = new Uint8Array(canvas.width * canvas.height);
    const queue   = [];
    for (let x=0;x<canvas.width;x++)  { queue.push([x,0]); queue.push([x,canvas.height-1]); }
    for (let y=0;y<canvas.height;y++) { queue.push([0,y]); queue.push([canvas.width-1,y]);  }
    samples.forEach(({x,y}) => queue.push([x,y]));
    const isBg = (r,g,b) => allBg.some(([br,bg,bb]) => Math.abs(r-br)+Math.abs(g-bg)+Math.abs(b-bb)<tol);
    let qi=0;
    while (qi < queue.length) {
      const [x,y]=queue[qi++];
      if (x<0||x>=canvas.width||y<0||y>=canvas.height) continue;
      const idx=y*canvas.width+x;
      if (visited[idx]) continue;
      visited[idx]=1;
      const pi=idx*4;
      if (!isBg(d[pi],d[pi+1],d[pi+2])) continue;
      d[pi+3]=0;
      queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    // Suavizado de bordes
    for (let y=1;y<canvas.height-1;y++) for (let x=1;x<canvas.width-1;x++) {
      const idx=(y*canvas.width+x)*4;
      if (d[idx+3]>0) {
        const nb=[((y-1)*canvas.width+x)*4,((y+1)*canvas.width+x)*4,(y*canvas.width+(x-1))*4,(y*canvas.width+(x+1))*4];
        const t=nb.filter(n=>d[n+3]===0).length;
        if (t>0) d[idx+3]=Math.max(0,255-t*55);
      }
    }
    ctx.putImageData(imgData,0,0);
    resolve();
  });
}

/**
 * Remove background modo rápido — flood fill por color de esquina.
 * Fallback cuando la IA no está disponible.
 */
export function removeBackgroundFallback(canvas, tolerance = 30) {
  const ctx  = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d    = data.data;
  const tol  = tolerance * 3;
  const cr=d[0], cg=d[1], cb=d[2];
  for (let i=0;i<d.length;i+=4)
    if (Math.abs(d[i]-cr)+Math.abs(d[i+1]-cg)+Math.abs(d[i+2]-cb)<tol) d[i+3]=0;
  ctx.putImageData(data,0,0);
}
