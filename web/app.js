const state = {
  notes: [],
  selectedId: null,
  selectedNote: null
};

const els = {
  sources: document.querySelector("#sources"),
  sourceCount: document.querySelector("#source-count"),
  dailyLimit: document.querySelector("#daily-limit"),
  perChannelLimit: document.querySelector("#per-channel-limit"),
  lookbackDays: document.querySelector("#lookback-days"),
  noteCount: document.querySelector("#note-count"),
  processedCount: document.querySelector("#processed-count"),
  latestVideoCount: document.querySelector("#latest-video-count"),
  candidateLimit: document.querySelector("#candidate-limit"),
  latestRunTitle: document.querySelector("#latest-run-title"),
  notesList: document.querySelector("#notes-list"),
  reader: document.querySelector("#reader"),
  emptyState: document.querySelector("#empty-state"),
  transcriptPanel: document.querySelector("#transcript-panel"),
  transcript: document.querySelector("#transcript"),
  search: document.querySelector("#search"),
  runIntake: document.querySelector("#run-intake"),
  runStatus: document.querySelector("#run-status")
};

init();

async function init() {
  await refresh();
  els.search.addEventListener("input", renderNotes);
  els.runIntake.addEventListener("click", runIntake);
}

async function refresh() {
  const [summary, notes] = await Promise.all([
    fetchJson("/api/summary"),
    fetchJson("/api/notes")
  ]);

  state.notes = notes;
  renderSummary(summary);
  renderNotes();

  if (notes.length && !state.selectedId) {
    await selectNote(notes[0].id);
  }
}

function renderSummary(summary) {
  els.sourceCount.textContent = summary.channels.length;
  els.dailyLimit.textContent = summary.dailyLimit;
  els.perChannelLimit.textContent = summary.perChannelLimit;
  els.lookbackDays.textContent = `${summary.lookbackDays} days`;
  els.noteCount.textContent = summary.noteCount;
  els.processedCount.textContent = summary.processedCount;
  els.latestVideoCount.textContent = summary.latestRun.videos?.length ?? 0;
  els.candidateLimit.textContent = summary.candidateLimit;

  const runDate = summary.latestRun.createdAt
    ? new Date(summary.latestRun.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "No runs yet";
  els.latestRunTitle.textContent = runDate;

  els.sources.innerHTML = summary.channels.map((channel) => `
    <div class="source-item">
      <strong>${escapeHtml(channel.name)}</strong>
      <span>${escapeHtml(channel.handle || channel.url)}</span>
    </div>
  `).join("");
}

function renderNotes() {
  const query = els.search.value.trim().toLowerCase();
  const notes = state.notes.filter((note) => {
    const haystack = `${note.title} ${note.channel} ${note.excerpt}`.toLowerCase();
    return haystack.includes(query);
  });

  els.notesList.innerHTML = notes.map((note) => `
    <button class="note-row ${note.id === state.selectedId ? "active" : ""}" type="button" data-note-id="${escapeHtml(note.id)}">
      <div class="note-row-header">
        <span class="badge">${escapeHtml(note.status || "note")}</span>
        <span class="note-meta">
          <span class="note-channel">${escapeHtml(note.channel || "Unknown channel")}</span>
          <span>${formatDate(note.published)}</span>
        </span>
      </div>
      <h3>${escapeHtml(note.title)}</h3>
      <p>${escapeHtml(note.excerpt || "No preview available.")}</p>
    </button>
  `).join("");

  els.notesList.querySelectorAll(".note-row").forEach((button) => {
    button.addEventListener("click", () => selectNote(button.dataset.noteId));
  });
}

async function selectNote(noteId) {
  state.selectedId = noteId;
  renderNotes();

  const note = await fetchJson(`/api/notes/${encodeURIComponent(noteId)}`);
  state.selectedNote = note;
  els.reader.innerHTML = renderReader(note);
  applyHighlights();
  els.transcript.textContent = note.transcript.slice(0, 12000);

  els.emptyState.classList.add("hidden");
  els.reader.classList.remove("hidden");
  els.transcriptPanel.classList.toggle("hidden", !note.transcript);
}

function renderReader(note) {
  const videoUrl = note.meta?.video_url;
  const sourceLink = videoUrl
    ? `<a class="source-link" href="${escapeHtml(videoUrl)}" target="_blank" rel="noreferrer">Original video</a>`
    : "";

  return `
    <div class="reader-actions">
      <div class="highlight-tools" aria-label="Highlight tools">
        <button class="highlight-button highlight-yellow" type="button" data-highlight-color="yellow" title="Highlight"></button>
      </div>
      ${sourceLink}
    </div>
    <div class="reader-body">${note.html}</div>
  `;
}

els.reader.addEventListener("click", async (event) => {
  const highlight = event.target.closest(".reader-highlight");
  if (highlight) {
    await removeHighlight(Number(highlight.dataset.highlightIndex));
    return;
  }

  const button = event.target.closest("[data-highlight-color]");
  if (!button) return;

  await highlightSelection();
});

async function highlightSelection() {
  const body = els.reader.querySelector(".reader-body");
  const selection = window.getSelection();
  if (!body || !selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (!body.contains(range.commonAncestorContainer)) return;

  const bounds = getSelectionOffsets(body, range);
  if (!bounds || bounds.end <= bounds.start) return;

  state.selectedNote.highlights = [
    ...(state.selectedNote.highlights || []),
    { ...bounds, color: "yellow" }
  ];

  selection.removeAllRanges();
  applyHighlights();
  await saveHighlights();
}

async function removeHighlight(index) {
  if (!state.selectedNote || !Number.isInteger(index)) return;

  state.selectedNote.highlights = (state.selectedNote.highlights || [])
    .filter((_, highlightIndex) => highlightIndex !== index);

  applyHighlights();
  await saveHighlights();
}

function getSelectionOffsets(root, range) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let start = null;
  let end = null;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const length = node.nodeValue.length;

    if (node === range.startContainer) {
      start = offset + range.startOffset;
    }
    if (node === range.endContainer) {
      end = offset + range.endOffset;
    }

    offset += length;
  }

  return start === null || end === null ? null : { start, end };
}

function applyHighlights() {
  const body = els.reader.querySelector(".reader-body");
  if (!body || !state.selectedNote) return;

  unwrapHighlights(body);

  const highlights = (state.selectedNote.highlights || [])
    .map((highlight, index) => ({ ...highlight, index }))
    .filter((highlight) => highlight.end > highlight.start)
    .sort((a, b) => b.start - a.start || b.end - a.end);

  highlights.forEach((highlight) => wrapHighlight(body, highlight));
}

function unwrapHighlights(root) {
  root.querySelectorAll("mark.reader-highlight").forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent));
  });
  root.normalize();
}

function wrapHighlight(root, highlight) {
  const range = rangeFromOffsets(root, highlight.start, highlight.end);
  if (!range) return;

  const mark = document.createElement("mark");
  mark.className = `reader-highlight highlight-${highlight.color}`;
  mark.dataset.highlightIndex = String(highlight.index);
  mark.title = "Remove highlight";

  try {
    range.surroundContents(mark);
  } catch {
    mark.append(range.extractContents());
    range.insertNode(mark);
  }
}

function rangeFromOffsets(root, start, end) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let foundStart = false;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const nextOffset = offset + node.nodeValue.length;

    if (!foundStart && start >= offset && start <= nextOffset) {
      range.setStart(node, start - offset);
      foundStart = true;
    }
    if (foundStart && end >= offset && end <= nextOffset) {
      range.setEnd(node, end - offset);
      return range;
    }

    offset = nextOffset;
  }

  return null;
}

async function saveHighlights() {
  if (!state.selectedId || !state.selectedNote) return;

  const result = await fetchJson(`/api/notes/${encodeURIComponent(state.selectedId)}/highlights`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ highlights: state.selectedNote.highlights || [] })
  });

  state.selectedNote.highlights = result.highlights;
}

async function runIntake() {
  els.runIntake.disabled = true;
  els.runStatus.textContent = "Running intake...";

  try {
    const result = await fetchJson("/api/intake", { method: "POST" });
    els.runStatus.textContent = result.code === 0 ? "Intake finished." : "Intake finished with warnings.";
    await refresh();
  } catch (error) {
    els.runStatus.textContent = error.message;
  } finally {
    els.runIntake.disabled = false;
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
