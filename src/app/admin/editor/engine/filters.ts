export const FILTERS: Record<string, Record<string, number>> = {
  none:       { brightness:0,  contrast:0,   saturation:0,   temperature:0,  tint:0,  blur:0 },
  cinematic:  { brightness:-10,contrast:25,  saturation:-20, temperature:-15,tint:0,  blur:0 },
  vintage:    { brightness:-5, contrast:-15, saturation:-40, temperature:35, tint:10, blur:0 },
  highcontrast:{ brightness:5, contrast:65,  saturation:15,  temperature:0,  tint:0,  blur:0 },
  cool:       { brightness:0,  contrast:5,   saturation:0,   temperature:-50,tint:0,  blur:0 },
  warm:       { brightness:5,  contrast:0,   saturation:10,  temperature:50, tint:0,  blur:0 },
  bw:         { brightness:0,  contrast:15,  saturation:-100,temperature:0,  tint:0,  blur:0 },
  fade:       { brightness:25, contrast:-25, saturation:-30, temperature:15, tint:0,  blur:0 },
};

export function buildCSSFilter(s: {
  brightness:number; contrast:number; exposure:number;
  saturation:number; temperature:number; tint:number;
  sharpness:number; blur:number;
}): string {
  const b = s.brightness + s.exposure;
  const sat = Math.max(0, s.saturation + 100);
  const con = s.contrast + 100;
  let f = `brightness(${(b / 100 + 1).toFixed(3)}) contrast(${(con / 100).toFixed(3)}) saturate(${(sat / 100).toFixed(3)})`;
  if (s.tint !== 0)        f += ` hue-rotate(${(s.tint * 0.4).toFixed(1)}deg)`;
  if (s.temperature > 0)   f += ` sepia(${(s.temperature / 200).toFixed(3)})`;
  else if (s.temperature < 0) f += ` hue-rotate(${(s.temperature / 3).toFixed(1)}deg)`;
  if (s.blur > 0)          f += ` blur(${(s.blur * 0.3).toFixed(2)}px)`;
  if (s.sharpness > 0)     f += ` contrast(${(1 + s.sharpness / 300).toFixed(3)})`;
  return f;
}




