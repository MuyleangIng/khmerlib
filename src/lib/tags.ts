const JSONISH_PREFIX = /^[\s]*[[\"]/;

function unwrapJsonish(value: unknown): unknown {
  let current = value;

  for (let i = 0; i < 4; i++) {
    if (typeof current !== "string") break;

    const text = current.trim();
    if (!text || !JSONISH_PREFIX.test(text)) break;

    try {
      current = JSON.parse(text);
    } catch {
      break;
    }
  }

  return current;
}

function cleanTagToken(value: string) {
  return value
    .replace(/\\"/g, "\"")
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\")
    .replace(/^[\s"'`[\](){}]+|[\s"'`[\](){}]+$/g, "")
    .trim();
}

function collectTags(value: unknown): string[] {
  const normalized = unwrapJsonish(value);

  if (Array.isArray(normalized)) {
    return normalized.flatMap((item) => collectTags(item));
  }

  if (typeof normalized !== "string") {
    return [];
  }

  const text = normalized.trim();
  if (!text) return [];

  return text
    .split(",")
    .map((token) => cleanTagToken(token))
    .filter(Boolean);
}

export function parseTagList(value: unknown): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const tag of collectTags(value)) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

export function stringifyTagList(value: unknown) {
  return JSON.stringify(parseTagList(value));
}

export function formatTagListInput(value: unknown) {
  return parseTagList(value).join(", ");
}
