import { NextRequest, NextResponse } from "next/server";
import { scrapeJobUrl } from "@/lib/scraper";

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL requise" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  const result = await scrapeJobUrl(url);
  return NextResponse.json(result);
}
