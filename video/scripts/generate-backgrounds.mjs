import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(import.meta.dirname, "..", "public", "generated");

const SHOTS = [
  {
    name: "opening-bg",
    prompt:
      "Shallow depth of field cinematic photo of a cozy modern living room at golden hour, warm sunlight streaming in, soft bokeh, blurred wooden table, plant, and furniture, warm amber and brown tones, no people, no text, no logos, no phone, no screens, professional commercial photography",
  },
  {
    name: "beat1-bg",
    prompt:
      "Shallow depth of field cinematic photo of a warm home interior at golden hour, blurred bookshelf and window light, soft amber bokeh, cozy atmosphere, no people, no text, no logos, no phone, no screens, professional commercial photography",
  },
  {
    name: "beat2-bg",
    prompt:
      "Shallow depth of field cinematic photo of a modern clinic hallway, soft cool daylight, blurred medical equipment and glass, calm clinical atmosphere, blue-gray bokeh tones, no people, no text, no logos, no phone, no screens, professional commercial photography",
  },
  {
    name: "outro-bg",
    prompt:
      "Dramatic dusk sky with warm golden and deep blue clouds, cinematic wide atmospheric photo, soft light rays, no people, no text, no logos, no objects, professional commercial photography",
  },
];

async function generate(shot) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: shot.prompt,
      size: "1536x1024",
      n: 1,
    }),
  });

  if (!res.ok) {
    throw new Error(`${shot.name}: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const b64 = json.data[0].b64_json;
  await writeFile(path.join(OUT_DIR, `${shot.name}.png`), Buffer.from(b64, "base64"));
  console.log(`saved ${shot.name}.png`);
}

await mkdir(OUT_DIR, { recursive: true });
for (const shot of SHOTS) {
  await generate(shot);
}
