# Daily Digest Learning App

This is the first lightweight version of the learning workflow:

1. Check configured YouTube channels.
2. Pick up to 3 recent, unprocessed videos.
3. Use `yt-dlp` to download subtitles/transcripts.
4. Create Markdown learning-note drafts.
5. Let Codex fill the drafts during the daily scheduled run.

The default channel is `硅谷101` at `https://www.youtube.com/@valley101podcast`.

## Setup

Install `yt-dlp`:

```bash
brew install yt-dlp
```

or:

```bash
python3 -m pip install -U yt-dlp
```

## Commands

Preview which videos would be selected:

```bash
npm run intake:dry-run
```

Download transcripts and create note drafts:

```bash
npm run intake
```

## Files

- `config/channels.json`: channel list and daily limits
- `data/processed-videos.json`: generated state for already processed videos
- `data/latest-intake.json`: generated summary of the latest run
- `transcripts/raw`: raw `.vtt` subtitle files from `yt-dlp`
- `transcripts/clean`: cleaned transcript text
- `notes`: Markdown learning notes

## Daily Codex Routine

The scheduled Codex run should:

1. Run `npm run intake`.
2. Read `data/latest-intake.json`.
3. For each draft note, read the referenced transcript.
4. Replace the TODO sections with a concise learning note:
   - what this is about
   - important concepts
   - learning takeaways
   - questions to explore
   - useful examples, tools, or links
   - optional post draft
5. Leave a short summary of which videos were processed.

# news_digest
