#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "config", "channels.json");
const DATA_DIR = path.join(ROOT, "data");
const RAW_TRANSCRIPT_DIR = path.join(ROOT, "transcripts", "raw");
const CLEAN_TRANSCRIPT_DIR = path.join(ROOT, "transcripts", "clean");
const NOTES_DIR = path.join(ROOT, "notes");
const PROCESSED_PATH = path.join(DATA_DIR, "processed-videos.json");
const INTAKE_PATH = path.join(DATA_DIR, "latest-intake.json");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  await ensureDirs();

  const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  const processed = await readJson(PROCESSED_PATH, { videos: {} });
  const dailyLimit = config.dailyLimit ?? 3;
  const perChannelLimit = config.perChannelLimit ?? dailyLimit;
  const candidateLimit = config.candidateLimit ?? dailyLimit * 5;
  const videos = await collectCandidates(config, processed);
  const selected = limitPerChannel(videos, perChannelLimit).slice(0, candidateLimit);

  if (selected.length === 0) {
    await writeFile(INTAKE_PATH, JSON.stringify({ createdAt: new Date().toISOString(), videos: [] }, null, 2));
    console.log("No new videos found for today's intake.");
    return;
  }

  if (dryRun) {
    console.log(JSON.stringify({ selected }, null, 2));
    return;
  }

  const ytdlp = findYtDlp();
  if (!ytdlp) {
    throw new Error(
      "yt-dlp is not installed. Install it with `brew install yt-dlp` or `python3 -m pip install -U yt-dlp`, then run `npm run intake` again."
    );
  }

  const intake = [];
  for (const video of selected) {
    if (intake.length >= dailyLimit) break;

    console.log(`Processing ${video.title}`);
    const transcript = await downloadTranscript(ytdlp, video).catch((error) => {
      console.warn(`Skipping ${video.title}: ${error.message}`);
      return null;
    });
    if (!transcript) continue;

    const notePath = await writeNoteDraft(video, transcript);

    processed.videos[video.videoId] = {
      title: video.title,
      url: video.url,
      processedAt: new Date().toISOString(),
      transcriptPath: transcript.cleanPath,
      notePath
    };

    intake.push({ ...video, transcriptPath: transcript.cleanPath, notePath });
  }

  await writeFile(PROCESSED_PATH, JSON.stringify(processed, null, 2));
  await writeFile(INTAKE_PATH, JSON.stringify({ createdAt: new Date().toISOString(), videos: intake }, null, 2));
  console.log(`Prepared ${intake.length} learning note draft(s).`);
}

async function ensureDirs() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(RAW_TRANSCRIPT_DIR, { recursive: true });
  await mkdir(CLEAN_TRANSCRIPT_DIR, { recursive: true });
  await mkdir(NOTES_DIR, { recursive: true });
}

async function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function collectCandidates(config, processed) {
  const channels = (config.channels ?? []).filter((channel) => channel.enabled !== false);
  const lookbackMs = (config.lookbackDays ?? 7) * 24 * 60 * 60 * 1000;
  const oldest = Date.now() - lookbackMs;
  const candidates = [];

  for (const channel of channels) {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel.channelId)}`;
    const response = await fetch(feedUrl);
    if (!response.ok) {
      throw new Error(`Could not fetch feed for ${channel.name}: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    for (const entry of parseFeedEntries(xml)) {
      const publishedAt = Date.parse(entry.published);
      if (Number.isNaN(publishedAt) || publishedAt < oldest) continue;
      if (processed.videos?.[entry.videoId]) continue;
      if (!matchesKeywords(entry, channel.keywords)) continue;

      candidates.push({
        channelName: channel.name,
        channelId: channel.channelId,
        videoId: entry.videoId,
        title: entry.title,
        url: `https://www.youtube.com/watch?v=${entry.videoId}`,
        published: entry.published
      });
    }
  }

  return candidates.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
}

function limitPerChannel(videos, perChannelLimit) {
  const counts = new Map();
  return videos.filter((video) => {
    const count = counts.get(video.channelId) ?? 0;
    if (count >= perChannelLimit) return false;
    counts.set(video.channelId, count + 1);
    return true;
  });
}

function parseFeedEntries(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => {
    const entryXml = match[1];
    return {
      videoId: textBetween(entryXml, "yt:videoId"),
      title: decodeXml(textBetween(entryXml, "title")),
      published: textBetween(entryXml, "published")
    };
  }).filter((entry) => entry.videoId && entry.title);
}

function textBetween(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : "";
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function matchesKeywords(entry, keywords = []) {
  if (!keywords.length) return true;
  const haystack = `${entry.title}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
}

function findYtDlp() {
  if (spawnSync("yt-dlp", ["--version"], { stdio: "ignore" }).status === 0) {
    return { command: "yt-dlp", argsPrefix: [] };
  }
  if (spawnSync("python3", ["-m", "yt_dlp", "--version"], { stdio: "ignore" }).status === 0) {
    return { command: "python3", argsPrefix: ["-m", "yt_dlp"] };
  }
  return null;
}

async function downloadTranscript(ytdlp, video) {
  const rawDir = path.join(RAW_TRANSCRIPT_DIR, video.videoId);
  await mkdir(rawDir, { recursive: true });

  const outputTemplate = path.join(rawDir, "%(id)s.%(ext)s");
  const args = [
    ...ytdlp.argsPrefix,
    "--skip-download",
    "--write-subs",
    "--write-auto-subs",
    "--sub-langs",
    "en,zh",
    "--sub-format",
    "vtt",
    "--output",
    outputTemplate,
    video.url
  ];

  await run(ytdlp.command, args).catch(async (error) => {
    const files = await readdir(rawDir);
    if (!pickTranscriptFile(files)) throw error;
    console.warn(`yt-dlp reported an error, but a transcript file exists for ${video.title}. Continuing.`);
  });

  const files = await readdir(rawDir);
  const transcriptFile = pickTranscriptFile(files);
  if (!transcriptFile) {
    throw new Error(`No transcript was downloaded for ${video.title}.`);
  }

  const rawPath = path.join(rawDir, transcriptFile);
  const cleanPath = path.join(CLEAN_TRANSCRIPT_DIR, `${video.videoId}.txt`);
  const cleanText = cleanVtt(await readFile(rawPath, "utf8"));
  await writeFile(cleanPath, cleanText);

  return { rawPath, cleanPath };
}

function pickTranscriptFile(files) {
  const vttFiles = files.filter((file) => file.endsWith(".vtt"));
  if (!vttFiles.length) return null;

  const preferredLanguageOrder = [
    ".zh-Hans.",
    ".zh-Hant.",
    ".zh-CN.",
    ".zh-TW.",
    ".zh.",
    ".en."
  ];

  return preferredLanguageOrder
    .map((language) => vttFiles.find((file) => file.includes(language)))
    .find(Boolean) ?? vttFiles[0];
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function cleanVtt(vtt) {
  const seen = new Set();
  const lines = vtt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line !== "WEBVTT")
    .filter((line) => !line.includes("-->"))
    .filter((line) => !/^(Kind|Language):/.test(line))
    .map((line) => line.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    });

  return `${lines.join("\n")}\n`;
}

async function writeNoteDraft(video, transcript) {
  const date = new Date(video.published).toISOString().slice(0, 10);
  const slug = slugify(video.title).slice(0, 80) || video.videoId;
  const notePath = path.join(NOTES_DIR, `${date}-${slug}.md`);
  const body = `---
title: "${video.title.replaceAll("\"", "\\\"")}"
channel: "${video.channelName}"
video_url: "${video.url}"
published: "${video.published}"
transcript: "${path.relative(ROOT, transcript.cleanPath)}"
status: "draft"
---

# ${video.title}

## What This Is About

TODO: Codex fills this from the transcript.

## Important Concepts

- TODO

## Learning Takeaways

- TODO

## Questions To Explore

- TODO

## Useful Examples, Tools, Or Links

- TODO

## Optional Post Draft

TODO: Turn the learning note into a short Rednote-style post only if useful.
`;

  await writeFile(notePath, body);
  return notePath;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
