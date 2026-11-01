# WHITYRAY AI CINEMA

AI film production studio: create a film brief, split it into editable scenes, generate clips, preview them and export a project manifest.

## Run locally
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Providers
- Replicate: set REPLICATE_API_TOKEN and REPLICATE_MODEL to the exact model slug supported by your account. Optional REPLICATE_VERSION.
- Hugging Face: set HF_TOKEN and HF_ENDPOINT_URL to a deployed inference endpoint returning MP4 bytes or JSON containing a video URL.

Keep all keys server-side. Never use NEXT_PUBLIC for secrets.

## API
- GET /api/health reports provider readiness without exposing keys.
- POST /api/generate accepts { prompt, duration, aspectRatio, negativePrompt } and generates one scene.

This is the film-production and scene-generation foundation. A feature-length film requires many clip generations, persistent storage, editing/assembly, and a provider/GPU plan. Model input schemas vary; adapt the Replicate adapter to the exact model's documented inputs before production use. Hugging Face endpoint payloads are also model-specific.
