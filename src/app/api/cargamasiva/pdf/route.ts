import { NextResponse } from "next/server";
import { CargaMasivaModule } from "core-cargamasiva/dist/index.js";
import { writeFile } from "fs/promises";

const cm = new CargaMasivaModule();

export async function POST(req: Request) {
  const data = await req.formData();
  const file = data.get("file") as File;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filePath = /tmp/;
  await writeFile(filePath, buffer);

  const result = await cm.importFromPdf(filePath);
  return NextResponse.json({ ok: true, result });
}
