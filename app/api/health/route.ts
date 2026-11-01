import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  const replicate = Boolean(process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_MODEL);
  const hf = Boolean(process.env.HF_TOKEN && process.env.HF_ENDPOINT_URL);
  return NextResponse.json({ ok: true, app: "WHITYRAY AI CINEMA", providers: { replicate: replicate ? "ready" : "not_configured", huggingface_endpoint: hf ? "ready" : "not_configured" }, configured: replicate || hf });
}
