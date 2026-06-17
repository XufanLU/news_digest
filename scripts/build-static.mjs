#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createNoteRecord, isPublishableNote } from "./content.mjs";

const ROOT = process.cwd();

export async function buildStaticSite({ root = ROOT, outputDir = join(root, "dist") } = {}) {
  const notesDir = join(root, "notes");
  const webDir = join(root, "web");

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(join(outputDir, "data"), { recursive: true });
  await cp(webDir, outputDir, { recursive: true });

  const files = existsSync(notesDir)
    ? (await readdir(notesDir)).filter((file) => file.endsWith(".md")).sort().reverse()
    : [];

  const notes = [];
  for (const file of files) {
    const markdown = await readFile(join(notesDir, file), "utf8");
    const note = createNoteRecord(file, markdown);
    if (isPublishableNote(note, markdown)) {
      note.html = note.html.replace(/<li>Transcript:.*?<\/li>\n?/gi, "");
      notes.push(note);
    }
  }

  const [channels, latestIntake, processed] = await Promise.all([
    readJson(join(root, "config", "channels.json"), { channels: [] }),
    readJson(join(root, "data", "latest-intake.json"), { videos: [] }),
    readJson(join(root, "data", "processed-videos.json"), { videos: {} })
  ]);

  const siteData = {
    generatedAt: new Date().toISOString(),
    summary: {
      channels: (channels.channels ?? []).map(({ name, handle, url }) => ({ name, handle, url })),
      dailyLimit: channels.dailyLimit ?? 3,
      perChannelLimit: channels.perChannelLimit ?? channels.dailyLimit ?? 3,
      lookbackDays: channels.lookbackDays ?? 30,
      candidateLimit: channels.candidateLimit ?? 15,
      latestRunAt: latestIntake.createdAt ?? "",
      latestVideoCount: latestIntake.videos?.length ?? 0,
      processedCount: Object.keys(processed.videos ?? {}).length,
      noteCount: notes.length
    },
    notes
  };

  const indexPath = join(outputDir, "index.html");
  const index = await readFile(indexPath, "utf8");
  await writeFile(
    indexPath,
    index
      .replace("<body>", '<body data-app-mode="static">')
      .replace(/\s*<button id="run-intake"[\s\S]*?<\/button>/, "")
      .replace(/\s*<p id="run-status"[^>]*><\/p>/, "")
      .replace(/\s*<details id="transcript-panel"[\s\S]*?<\/details>/, "")
      .replace(
        "Generated learning notes and transcript previews will appear here.",
        "Generated learning notes will appear here."
      ),
    "utf8"
  );
  await writeFile(join(outputDir, "data", "site.json"), `${JSON.stringify(siteData, null, 2)}\n`, "utf8");
  await writeFile(join(outputDir, ".nojekyll"), "", "utf8");

  return { outputDir: resolve(outputDir), noteCount: notes.length };
}

async function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(await readFile(filePath, "utf8"));
}

if (resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const result = await buildStaticSite();
  console.log(`Built ${result.noteCount} published notes in ${result.outputDir}`);
}
