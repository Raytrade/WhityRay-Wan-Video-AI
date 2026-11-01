import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 300;

type Input = { prompt?: string; negativePrompt?: string; aspectRatio?: string; duration?: number; seed?: number };
const jsonError = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

async function replicate(input: Input) {
  const token = process.env.REPLICATE_API_TOKEN!;
  const model = process.env.REPLICATE_MODEL!;
  const version = process.env.REPLICATE_VERSION;
  const body: Record<string, unknown> = { input: { prompt: input.prompt, negative_prompt: input.negativePrompt || "blurry, low quality, distorted faces, watermark, text", aspect_ratio: input.aspectRatio || "16:9", duration: Math.min(10, Math.max(3, Number(input.duration) || 5)), ...(input.seed ? { seed: input.seed } : {}) } };
  if (version) body.version = version;
  const create = await fetch(version ? "https://api.replicate.com/v1/predictions" : `https://api.replicate.com/v1/models/${model}/predictions`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait=25" }, body: JSON.stringify(body), cache: "no-store" });
  const prediction = await create.json();
  if (!create.ok) throw new Error(prediction.detail || prediction.error || "Replicate could not start the video job.");
  let job = prediction;
  for (let i = 0; i < 50 && !["succeeded","failed","canceled"].includes(job.status); i++) {
    if (!job.urls?.get) break;
    await new Promise(r => setTimeout(r, 2500));
    const poll = await fetch(job.urls.get, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    job = await poll.json();
    if (!poll.ok) throw new Error("Could not check video generation status.");
  }
  if (job.status === "failed" || job.status === "canceled") throw new Error(job.error || "Video generation failed.");
  if (job.status !== "succeeded") return { status: "processing", id: job.id, pollUrl: job.urls?.get };
  const output = Array.isArray(job.output) ? job.output[0] : job.output;
  return { status: "succeeded", id: job.id, videoUrl: typeof output === "string" ? output : output?.url || output };
}

async function huggingFace(input: Input) {
  const endpoint = process.env.HF_ENDPOINT_URL!;
  const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json", Accept: "video/mp4, application/json" }, body: JSON.stringify({ inputs: input.prompt, parameters: { negative_prompt: input.negativePrompt, num_frames: Math.min(120, Math.max(16, (Number(input.duration) || 5) * 16)), guidance_scale: 7.5 } }), cache: "no-store", signal: AbortSignal.timeout(240000) });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Hugging Face endpoint ${response.status}: ${detail.slice(0, 500)}`);
  }
  const type = response.headers.get("content-type") || "";
  if (type.includes("json")) {
    const data = await response.json();
    const url = data.video_url || data.url || data.output?.[0] || data.output;
    if (typeof url === "string" && url.startsWith("http")) return { status: "succeeded", videoUrl: url };
    throw new Error(data.error || "Endpoint returned JSON but no video URL. Configure an endpoint that returns MP4 or a video URL.");
  }
  return new Response(response.body, { headers: { "Content-Type": type || "video/mp4", "Cache-Control": "no-store", "Content-Disposition": 'inline; filename="whityray-scene.mp4"' } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Input;
    const prompt = String(body.prompt || "").trim();
    if (prompt.length < 12) return jsonError("Write a more descriptive scene prompt (at least 12 characters).");
    if (prompt.length > 4000) return jsonError("Scene prompt is too long (maximum 4,000 characters).");
    if (process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_MODEL) return NextResponse.json(await replicate({ ...body, prompt }));
    if (process.env.HF_TOKEN && process.env.HF_ENDPOINT_URL) return await huggingFace({ ...body, prompt });
    return jsonError("No video provider is configured. Add REPLICATE_API_TOKEN + REPLICATE_MODEL, or HF_TOKEN + HF_ENDPOINT_URL, in Vercel Environment Variables.", 503);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected generation error.";
    return jsonError(message, 502);
  }
}
