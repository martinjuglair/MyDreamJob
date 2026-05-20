import { NextResponse } from "next/server";
import { DEFAULT_CV_DATA, renderCvHtml } from "@/lib/cv/template";

export async function GET() {
  const html = renderCvHtml(DEFAULT_CV_DATA);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
