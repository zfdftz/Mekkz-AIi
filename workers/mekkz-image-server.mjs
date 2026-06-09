#!/usr/bin/env node
/**
 * MEKKZ Image Worker — eigene Bilder auf deinem PC (Windows/Linux/macOS).
 *
 * Windows (empfohlen): Stable Diffusion WebUI
 *   SD_WEBUI_URL=http://127.0.0.1:7860
 *
 * macOS: Ollama Flux
 *   OLLAMA_BASE_URL=http://127.0.0.1:11434
 *   OLLAMA_IMAGE_MODEL=x/flux2-klein:4b
 *
 * Vercel (optional Tunnel):
 *   MEKKZ_IMAGE_WORKER_URL=https://dein-tunnel.loca.lt/generate
 */
import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const OLLAMA = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_IMAGE_MODEL || "x/flux2-klein:4b";
const SD_WEBUI = (process.env.SD_WEBUI_URL || "").replace(/\/+$/, "");
const SECRET = process.env.MEKKZ_IMAGE_WORKER_SECRET || "";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function generateViaWebUI(prompt) {
  const res = await fetch(`${SD_WEBUI}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      negative_prompt: "blurry, low quality, watermark",
      width: 512,
      height: 512,
      steps: 22,
      cfg_scale: 7
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 300) || `WebUI HTTP ${res.status}`);
  }

  const data = await res.json();
  const image = data.images?.[0];
  if (!image) {
    throw new Error("Stable Diffusion WebUI lieferte kein Bild.");
  }

  return { image, model: "stable-diffusion-webui" };
}

async function generateViaOllama(prompt) {
  const res = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      width: 512,
      height: 512
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 300) || `Ollama HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data.image) {
    throw new Error("Ollama lieferte kein Bild (Windows: WebUI nutzen).");
  }

  return { image: data.image, model: MODEL };
}

async function generateImage(prompt) {
  if (SD_WEBUI) {
    return generateViaWebUI(prompt);
  }
  return generateViaOllama(prompt);
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        backend: SD_WEBUI ? "sd-webui" : "ollama",
        model: SD_WEBUI ? "stable-diffusion-webui" : MODEL
      })
    );
    return;
  }

  if (req.method !== "POST" || req.url !== "/generate") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "POST /generate" }));
    return;
  }

  if (SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
  }

  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw);
    const prompt = String(body.prompt || "").trim();
    if (!prompt) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "prompt fehlt" }));
      return;
    }

    const result = await generateImage(prompt);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  } catch (error) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Generierung fehlgeschlagen"
      })
    );
  }
});

server.listen(PORT, () => {
  const backend = SD_WEBUI ? `SD WebUI ${SD_WEBUI}` : `Ollama ${MODEL}`;
  console.log(`MEKKZ Image Worker auf http://0.0.0.0:${PORT}/generate (${backend})`);
});
