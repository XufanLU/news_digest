export function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  return Object.fromEntries(match[1].split(/\r?\n/).map((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return null;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^"|"$/g, "");
    return [key, value];
  }).filter(Boolean));
}

export function firstBodyText(markdown) {
  return stripFrontmatter(markdown)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("-"))
    .slice(0, 2)
    .join(" ")
    .slice(0, 180);
}

export function renderMarkdown(markdown) {
  const lines = stripFrontmatter(markdown).split(/\r?\n/);
  const html = [];
  let listOpen = false;

  const closeList = () => {
    if (!listOpen) return;
    html.push("</ul>");
    listOpen = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }

    if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      closeList();
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith("- ")) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
    } else {
      closeList();
      html.push(`<p>${inlineMarkdown(line)}</p>`);
    }
  }

  closeList();
  return html.join("\n");
}

export function createNoteRecord(file, markdown) {
  const meta = parseFrontmatter(markdown);
  const videoId = getYouTubeVideoId(meta.video_url);

  return {
    id: file,
    file,
    title: meta.title ?? file.replace(/\.md$/, ""),
    channel: meta.channel ?? "",
    status: meta.status ?? "",
    published: meta.published ?? "",
    videoUrl: meta.video_url ?? "",
    thumbnailUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : "",
    excerpt: firstBodyText(markdown),
    html: renderMarkdown(markdown)
  };
}

export function isPublishableNote(note, markdown) {
  return note.status === "generated" && !/\bTODO\b/i.test(markdown);
}

export function getYouTubeVideoId(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1);
    if (url.hostname.endsWith("youtube.com")) return url.searchParams.get("v") ?? "";
  } catch {
    return "";
  }
  return "";
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
