export interface SrtCue {
  start: number;
  end: number;
  text: string;
}

export const MAX_SRT_FILE_BYTES = 2 * 1024 * 1024;

function parseTimestamp(value: string) {
  const match = value
    .trim()
    .match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})([,.](\d{1,3}))?/);

  if (!match) return null;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const ms = Number((match[5] ?? "0").padEnd(3, "0").slice(0, 3));

  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}

function cleanCueText(text: string) {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\{[^}]*}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTimedText(text: string) {
  return cleanCueText(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSrtCues(content?: string | null): SrtCue[] {
  if (!content?.trim()) return [];

  const blocks = content
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .replace(/^WEBVTT[^\n]*(?:\n|$)/i, "")
    .split(/\n{2,}/);

  const cues: SrtCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;

    const [startRaw, endRaw] = lines[timingIndex].split("-->").map((part) => part.trim());
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw.split(/\s+/)[0] ?? "");
    const text = cleanCueText(lines.slice(timingIndex + 1).join(" "));

    if (start == null || end == null || end <= start || !text) continue;
    cues.push({ start, end, text });
  }

  return cues.sort((a, b) => a.start - b.start);
}

export async function readSrtUpload(file: File) {
  if (file.size > MAX_SRT_FILE_BYTES) {
    throw new Error("SRT file is too large. Maximum size is 2MB.");
  }

  const lowerName = file.name.toLowerCase();
  const isSupported =
    lowerName.endsWith(".srt") ||
    lowerName.endsWith(".vtt") ||
    file.type.startsWith("text/") ||
    file.type === "application/x-subrip";

  if (!isSupported) {
    throw new Error("Only SRT or VTT subtitle files are allowed.");
  }

  const content = (await file.text()).replace(/\u0000/g, "").trim();
  if (!parseSrtCues(content).length) {
    throw new Error("Subtitle file has no valid SRT/VTT timing cues.");
  }

  return {
    content,
    fileName: file.name,
  };
}
