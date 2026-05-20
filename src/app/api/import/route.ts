import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { content, url, title } = await request.json();

  if (!content || content.length < 50) {
    return NextResponse.json(
      { error: "Contenu trop court" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, content, url, title });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
