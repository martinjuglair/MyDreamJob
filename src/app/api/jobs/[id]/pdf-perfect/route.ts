import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { PerfectCvDocument } from "@/lib/pdf/cv-template";
import type { PerfectCvData } from "@/lib/ai/prompts/perfect-cv";
import React from "react";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || !job.perfectCvData) {
    return NextResponse.json(
      { error: "CV parfait non disponible" },
      { status: 404 }
    );
  }

  // Load CV for contact info
  const cv = await prisma.cV.findFirst({ orderBy: { createdAt: "desc" } });

  try {
    const data = job.perfectCvData as unknown as PerfectCvData;

    // Extract basic contact info from CV text (best effort)
    const contact = extractContact(cv?.extractedText || "");

    const element = React.createElement(PerfectCvDocument, {
      data,
      name: "Capucine Busch",
      contact,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any);

    const safeName = `CV-Parfait-${job.company}-${job.role}`
      .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÉ\s-]/g, "")
      .replace(/\s+/g, "-");

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Perfect CV PDF error:", message);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF", detail: message },
      { status: 500 }
    );
  }
}

/** Best-effort extraction of contact info from raw CV text. */
function extractContact(text: string): {
  phone?: string;
  email?: string;
  location?: string;
} {
  const contact: { phone?: string; email?: string; location?: string } = {};

  // Phone: French formats (06/07 xx xx xx xx)
  const phoneMatch = text.match(/0[67]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/);
  if (phoneMatch) contact.phone = phoneMatch[0];

  // Email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) contact.email = emailMatch[0];

  return contact;
}
