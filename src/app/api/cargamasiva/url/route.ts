import { NextResponse } from "next/server";
import { CargaMasivaModule } from "core-cargamasiva/dist/index.js";

const cm = new CargaMasivaModule();

export async function POST(req: Request) {
  const { url } = await req.json();
  const result = await cm.importFromUrl(url);
  return NextResponse.json({ ok: true, result });
}
