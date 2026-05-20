import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { execFile } from "node:child_process";
import { writeFile, readFile, unlink, access } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const SCRIPT_DIR = join(process.cwd(), "src/lib/cv");
const MODIFY_SCRIPT = join(SCRIPT_DIR, "modify-pdf.py");
const ORIGINAL_PDF = join(process.cwd(), "public/cv-original.pdf");

/**
 * The Adapted CV feature uses PyMuPDF (Python) which is not available
 * on Vercel's Node runtime. We detect "we are on Vercel" via the env var
 * Vercel always sets, and return a clear error rather than crashing.
 */
function isVercel(): boolean {
  return !!process.env.VERCEL;
}

function runPython(
  inputPdf: string,
  adaptationsPath: string,
  outputPdf: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "python3",
      [MODIFY_SCRIPT, inputPdf, adaptationsPath, outputPdf],
      { timeout: 30_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      }
    );
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || !job.adaptedCvText) {
    return NextResponse.json(
      { error: "CV adapté non disponible" },
      { status: 404 }
    );
  }

  // On Vercel, Python3 isn't available — direct the user to "Perfect CV"
  if (isVercel()) {
    return NextResponse.json(
      {
        error:
          "Le CV adapté nécessite Python (local seulement). Utilise le CV Parfait, dispo partout.",
      },
      { status: 501 }
    );
  }

  // Verify original PDF template exists locally (it's gitignored — personal data)
  try {
    await access(ORIGINAL_PDF);
  } catch {
    return NextResponse.json(
      {
        error:
          "Le template public/cv-original.pdf est introuvable. Place-le dans /public pour activer cette fonctionnalité.",
      },
      { status: 500 }
    );
  }

  const uid = randomUUID();
  const adaptationsPath = join("/tmp", `cv-adapt-${uid}.json`);
  const outputPath = join("/tmp", `cv-output-${uid}.pdf`);

  try {
    // Write adaptations JSON to temp file
    await writeFile(adaptationsPath, job.adaptedCvText);

    // Run Python script to modify the PDF
    await runPython(ORIGINAL_PDF, adaptationsPath, outputPath);

    // Read the generated PDF
    const pdfBuffer = await readFile(outputPath);

    const safeName = `CV-${job.company}-${job.role}`
      .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÉ\s-]/g, "")
      .replace(/\s+/g, "-");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("PDF generation error:", message);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF", detail: message },
      { status: 500 }
    );
  } finally {
    // Clean up temp files
    await unlink(adaptationsPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
