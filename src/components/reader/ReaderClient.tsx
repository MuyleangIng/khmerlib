"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Book, ReadingSettings, DEFAULT_READING_SETTINGS, READING_THEMES } from "@/lib/types";
import { Settings, ArrowLeft, Mic, MicOff, FileText, BookOpen, Maximize, Minimize, Menu, X, ExternalLink, Volume2, Play, Pause, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import ReadingSettingsPanel from "./ReadingSettingsPanel";
import MarkdownReader from "./MarkdownReader";
import PinchZoom from "./PinchZoom";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { normalizeTimedText, parseSrtCues, SrtCue } from "@/lib/srt";

const PDFReader = dynamic(() => import("./PDFReader"), { ssr: false });

const READER_FULLSCREEN_ID = "reader-fullscreen-root";
const READER_TTS_CONTENT_ID = "reader-tts-content";

type ReadMode = "pdf" | "text";
type FullscreenMode = "off" | "native" | "fallback";
type TtsSentence = { id: string; text: string };
type ReaderSyncUnit = { id: string; text: string };
type AudioSyncUnit = ReaderSyncUnit & {
  normalized: string;
  compact: string;
  compactStart: number;
  compactEnd: number;
};
type TimedSrtCue = SrtCue & { targetIds?: string[] };
type IntlWithSegmenter = typeof Intl & {
  Segmenter?: new (locale: string, options: { granularity: "sentence" }) => {
    segment(input: string): Iterable<{ segment: string }>;
  };
};
type FabAction = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  show: boolean;
} & ({ href: string; onClick?: never } | { href?: never; onClick: () => void });

const READER_THEME_TOKENS: Record<ReadingSettings["theme"], {
  syncBg: string;
  syncShadow: string;
  proseMarkBg: string;
  proseMarkText: string;
  proseLink: string;
  proseBlockquoteBg: string;
  proseBlockquoteText: string;
  proseBlockquoteBorder: string;
}> = {
  default: {
    syncBg: "rgba(200, 80, 42, 0.16)",
    syncShadow: "rgba(200, 80, 42, 0.16)",
    proseMarkBg: "#fde68a",
    proseMarkText: "#5f280d",
    proseLink: "#b54722",
    proseBlockquoteBg: "#fdf4ef",
    proseBlockquoteText: "#3c312d",
    proseBlockquoteBorder: "#d86b3f",
  },
  sepia: {
    syncBg: "rgba(166, 103, 48, 0.16)",
    syncShadow: "rgba(166, 103, 48, 0.14)",
    proseMarkBg: "rgba(245, 205, 120, 0.7)",
    proseMarkText: "#6b3f11",
    proseLink: "#8f4f16",
    proseBlockquoteBg: "#efe1c4",
    proseBlockquoteText: "#5d4825",
    proseBlockquoteBorder: "#b37937",
  },
  dark: {
    syncBg: "rgba(255, 138, 92, 0.18)",
    syncShadow: "rgba(255, 138, 92, 0.18)",
    proseMarkBg: "rgba(255, 186, 118, 0.24)",
    proseMarkText: "#fff3db",
    proseLink: "#ffb58c",
    proseBlockquoteBg: "#231915",
    proseBlockquoteText: "#f2ddd2",
    proseBlockquoteBorder: "#ff9867",
  },
  green: {
    syncBg: "rgba(56, 133, 86, 0.16)",
    syncShadow: "rgba(56, 133, 86, 0.14)",
    proseMarkBg: "rgba(170, 219, 134, 0.78)",
    proseMarkText: "#173f1f",
    proseLink: "#256a38",
    proseBlockquoteBg: "#e3f0e3",
    proseBlockquoteText: "#24402d",
    proseBlockquoteBorder: "#4f8f63",
  },
};

function normalizeSettings(s: Partial<ReadingSettings>): ReadingSettings {
  return { ...DEFAULT_READING_SETTINGS, ...s };
}

// ── TTS helpers ───────────────────────────────────────────
let ttsRunId = 0;
let ttsSentences: TtsSentence[] = [];
let audioAutoScroll = true;
let audioProgrammaticScroll = false;
let _scrollResetTimer: ReturnType<typeof setTimeout> | null = null;
let _programmaticScrollTimer: ReturnType<typeof setTimeout> | null = null;
let activeSyncKey = "";
let activeSyncElements: HTMLElement[] = [];
const SYNC_CHAR_RE = /[\p{L}\p{M}\p{N}]/u;

function getSpeechLanguage(language?: string) {
  return language?.toLowerCase().startsWith("en") ? "en-US" : "km-KH";
}

function getBestVoice(language: string) {
  const voices = window.speechSynthesis.getVoices();
  const base = language.split("-")[0].toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === language.toLowerCase()) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ??
    voices.find((v) => v.default) ??
    voices[0] ??
    null
  );
}

function getTtsRate(language: string) {
  return language.toLowerCase().startsWith("km") ? 0.82 : 0.9;
}

function normalizeSpeechText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function compactTimedText(text: string) {
  return normalizeTimedText(text).replace(/\s+/g, "");
}

function isSyncCountedChar(ch: string) {
  return SYNC_CHAR_RE.test(ch.normalize("NFKC"));
}

function splitSentences(text: string, locale: string) {
  const Seg = (Intl as IntlWithSegmenter).Segmenter;
  if (Seg) {
    const segs = Array.from(new Seg(locale, { granularity: "sentence" }).segment(text), ({ segment }) => segment);
    if (segs.length > 0) return segs;
  }
  const parts: string[] = [];
  let cur = "";
  for (const ch of Array.from(text)) {
    cur += ch;
    if (/[.!?។៕]/.test(ch) || (cur.length > 180 && /[\s,;:]/.test(ch))) { parts.push(cur); cur = ""; }
  }
  if (cur) parts.push(cur);
  return parts;
}

function splitAudioSegments(text: string, locale: string) {
  return splitSentences(text, locale).flatMap((sentence) => {
    const chunks: string[] = [];
    let current = "";

    for (const ch of Array.from(sentence)) {
      current += ch;
      const trimmed = current.trim();
      if (!trimmed) continue;

      const compactLength = compactTimedText(trimmed).length;
      const hardBreak = /[.!?។៕៖]/.test(ch) && compactLength >= 8;
      const softBreak = /[\s,;:]/.test(ch) && compactLength >= 20;
      const forcedBreak = compactLength >= 34;

      if (hardBreak || softBreak || forcedBreak) {
        chunks.push(current);
        current = "";
      }
    }

    if (current.trim()) chunks.push(current);
    return chunks;
  });
}

function unwrapReaderSyncUnits(container: ParentNode = document) {
  container.querySelectorAll("span[data-reader-sync-unit]").forEach((span) => {
    span.parentNode?.replaceChild(document.createTextNode(span.textContent ?? ""), span);
    span.parentNode?.normalize();
  });
}

function prepareReaderSyncUnits(
  container: HTMLElement,
  splitParts: (text: string) => string[],
) {
  unwrapReaderSyncUnits(container);
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const p = (n as Text).parentElement;
      if (!p || p.closest("script,style,textarea,pre,code")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  const units: ReaderSyncUnit[] = [];
  let idx = 0;
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    splitParts(node.textContent ?? "").forEach((part) => {
      if (!normalizeSpeechText(part)) {
        frag.append(document.createTextNode(part));
        return;
      }
      const id = `tts-${idx++}`;
      const span = document.createElement("span");
      span.className = "reader-sync-unit";
      span.dataset.readerSyncUnit = id;
      span.textContent = part;
      frag.append(span);
      units.push({ id, text: part });
    });
    node.replaceWith(frag);
  });
  return units;
}

function prepareTtsSentences(container: HTMLElement, locale: string) {
  return prepareReaderSyncUnits(container, (text) => splitSentences(text, locale))
    .map((unit) => ({ id: unit.id, text: normalizeSpeechText(unit.text) }))
    .filter((unit) => unit.text.length > 0);
}

function prepareAudioSyncUnits(container: HTMLElement, locale: string): AudioSyncUnit[] {
  const units = prepareReaderSyncUnits(container, (text) => splitAudioSegments(text, locale));
  let compactCursor = 0;

  return units.map((unit) => {
    const normalized = normalizeTimedText(unit.text);
    const compact = compactTimedText(unit.text);
    const compactStart = compactCursor;
    compactCursor += compact.length;
    return {
      ...unit,
      normalized,
      compact,
      compactStart,
      compactEnd: compactCursor,
    };
  });
}

function prepareCueBoundedTimedCues(container: HTMLElement, cues: SrtCue[]): TimedSrtCue[] {
  if (!cues.length) return [];

  unwrapReaderSyncUnits(container);

  const nodes: Text[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const p = (n as Text).parentElement;
      if (!p || p.closest("script,style,textarea,pre,code")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  const cueCompacts = cues.map((cue) => compactTimedText(cue.text));
  const cueTargetIds = cues.map(() => [] as string[]);
  let cueIndex = 0;
  let remaining = cueCompacts[0]?.length ?? 0;
  let readyToClose = false;
  let partCounter = 0;

  const advanceCue = () => {
    cueIndex += 1;
    readyToClose = false;
    remaining = cueCompacts[cueIndex]?.length ?? 0;
    while (cueIndex < cueCompacts.length && remaining <= 0) {
      cueIndex += 1;
      remaining = cueCompacts[cueIndex]?.length ?? 0;
    }
  };

  while (cueIndex < cueCompacts.length && remaining <= 0) {
    advanceCue();
  }

  nodes.forEach((node) => {
    const text = node.textContent ?? "";
    const frag = document.createDocumentFragment();
    let buffer = "";
    let bufferCueIndex = cueIndex < cues.length ? cueIndex : -1;

    const flushBuffer = () => {
      if (!buffer) return;

      if (bufferCueIndex >= 0 && bufferCueIndex < cues.length) {
        const partId = `cue-${bufferCueIndex}-${partCounter++}`;
        const span = document.createElement("span");
        span.className = "reader-sync-unit";
        span.dataset.readerSyncUnit = partId;
        span.textContent = buffer;
        frag.append(span);
        cueTargetIds[bufferCueIndex].push(partId);
      } else {
        frag.append(document.createTextNode(buffer));
      }

      buffer = "";
    };

    for (const ch of Array.from(text)) {
      const counted = isSyncCountedChar(ch);

      if (readyToClose && counted) {
        flushBuffer();
        advanceCue();
        bufferCueIndex = cueIndex < cues.length ? cueIndex : -1;
      }

      const nextCueIndex = cueIndex < cues.length ? cueIndex : -1;
      if (bufferCueIndex !== nextCueIndex) {
        flushBuffer();
        bufferCueIndex = nextCueIndex;
      }

      buffer += ch;

      if (cueIndex < cues.length && counted && remaining > 0) {
        remaining -= 1;
        if (remaining <= 0) {
          readyToClose = true;
        }
      }
    }

    flushBuffer();
    node.replaceWith(frag);
  });

  return cues.map((cue, index) => ({
    ...cue,
    targetIds: cueTargetIds[index].length ? cueTargetIds[index] : undefined,
  }));
}

function findUnitRangeByCompactOffsets(units: AudioSyncUnit[], startOffset: number, endOffset: number) {
  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    if (startIndex < 0 && unit.compactEnd > startOffset) startIndex = i;
    if (startIndex >= 0 && unit.compactStart < endOffset) endIndex = i;
    if (unit.compactStart >= endOffset) break;
  }

  if (startIndex < 0) return null;
  return { startIndex, endIndex: Math.max(startIndex, endIndex) };
}

function mapSrtCuesToUnits(cues: SrtCue[], units: AudioSyncUnit[]): TimedSrtCue[] {
  if (!cues.length || !units.length) return [];

  const fullCompactText = units.map((unit) => unit.compact).join("");
  let compactCursor = 0;
  let unitCursor = 0;

  return cues.map((cue, cueIndex) => {
    const cueCompact = compactTimedText(cue.text);
    let targetIds: string[] | undefined;

    if (cueCompact) {
      const searchStart = Math.max(0, compactCursor - 12);
      const matchOffset = fullCompactText.indexOf(cueCompact, searchStart);

      if (matchOffset >= 0) {
        const range = findUnitRangeByCompactOffsets(
          units,
          matchOffset,
          matchOffset + cueCompact.length,
        );

        if (range) {
          targetIds = units
            .slice(range.startIndex, range.endIndex + 1)
            .map((unit) => unit.id);
          compactCursor = matchOffset + cueCompact.length;
          unitCursor = range.endIndex + 1;
        }
      }
    }

    if (!targetIds?.length) {
      const progressIndex = Math.round(
        (cueIndex / Math.max(1, cues.length - 1)) * (units.length - 1)
      );
      const fallbackIndex = Math.min(
        units.length - 1,
        Math.max(0, Math.max(unitCursor, progressIndex))
      );
      targetIds = [units[fallbackIndex]?.id].filter(Boolean) as string[];
      unitCursor = Math.min(units.length - 1, fallbackIndex + 1);
    }

    return { ...cue, targetIds };
  });
}

function findActiveCueIndex(cues: TimedSrtCue[], time: number, lastIndex = -1) {
  if (!cues.length) return -1;

  const leadGrace = 0.06;
  const trailGrace = 0.14;

  const tryIndex = (index: number) => {
    const cue = cues[index];
    if (!cue) return -1;
    if (time >= cue.start - leadGrace && time <= cue.end + trailGrace) return index;
    return -1;
  };

  if (lastIndex >= 0) {
    const same = tryIndex(lastIndex);
    if (same >= 0) return same;
    const next = tryIndex(lastIndex + 1);
    if (next >= 0) return next;
    const prev = tryIndex(lastIndex - 1);
    if (prev >= 0) return prev;
  }

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (time >= cue.start - leadGrace && time <= cue.end + trailGrace) return i;
    if (time < cue.start - leadGrace) break;
  }

  return -1;
}

function clearTtsHighlight() {
  activeSyncElements.forEach((el) => el.classList.remove("reader-sync-unit--active"));
  activeSyncElements = [];
  activeSyncKey = "";
}

function activateTtsSentence(ids: string[]) {
  const nextIds = ids.filter(Boolean);
  const key = nextIds.join("|");
  if (!nextIds.length) {
    clearTtsHighlight();
    return;
  }
  if (activeSyncKey === key) return;

  clearTtsHighlight();
  const elements = nextIds
    .map((id) => document.querySelector<HTMLElement>(`[data-reader-sync-unit="${id}"]`))
    .filter(Boolean) as HTMLElement[];
  if (!elements.length) return;

  elements.forEach((el) => el.classList.add("reader-sync-unit--active"));
  activeSyncElements = elements;
  activeSyncKey = key;
  const el = elements[0];
  if (audioAutoScroll) {
    audioProgrammaticScroll = true;
    if (_programmaticScrollTimer) clearTimeout(_programmaticScrollTimer);
    const fullscreenScroller = el.closest(".reader-page--fullscreen .reader-content") as HTMLElement | null;
    if (fullscreenScroller) {
      const scrollerRect = fullscreenScroller.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const nextTop =
        fullscreenScroller.scrollTop +
        elRect.top -
        scrollerRect.top -
        fullscreenScroller.clientHeight / 2 +
        elRect.height / 2;
      fullscreenScroller.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    _programmaticScrollTimer = setTimeout(() => {
      audioProgrammaticScroll = false;
    }, 650);
  }
}

function getStartSentenceIndex(sentences: TtsSentence[]) {
  const top = 96, bottom = window.innerHeight - 96;
  let closest = 0, closestDist = Infinity;
  for (let i = 0; i < sentences.length; i++) {
    const el = document.querySelector<HTMLElement>(`[data-reader-sync-unit="${sentences[i].id}"]`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom > top && r.top < bottom) return i;
    const d = Math.abs(r.top - top);
    if (d < closestDist) { closestDist = d; closest = i; }
  }
  return closest;
}

function stopSentenceSpeech() {
  ttsRunId += 1;
  ttsSentences = [];
  window.speechSynthesis.cancel();
  clearTtsHighlight();
  const c = document.getElementById(READER_TTS_CONTENT_ID);
  if (c) unwrapReaderSyncUnits(c);
}

function speakSentenceAt(index: number, language: string, voiceURI: string | undefined, runId: number, onDone: () => void) {
  if (runId !== ttsRunId) return;
  const sentence = ttsSentences[index];
  if (!sentence) {
    clearTtsHighlight();
    const c = document.getElementById(READER_TTS_CONTENT_ID);
    if (c) unwrapReaderSyncUnits(c);
    onDone();
    return;
  }
  activateTtsSentence([sentence.id]);
  const utterance = new SpeechSynthesisUtterance(sentence.text);
  utterance.lang = language;
  utterance.rate = getTtsRate(language);
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.voiceURI === voiceURI) ?? getBestVoice(language);
  if (voice) utterance.voice = voice;
  utterance.onend = () => speakSentenceAt(index + 1, language, voiceURI, runId, onDone);
  utterance.onerror = () => speakSentenceAt(index + 1, language, voiceURI, runId, onDone);
  window.speechSynthesis.speak(utterance);
}

// ── Format time ───────────────────────────────────────────
function fmtTime(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────
export default function ReaderClient({ book }: { book: Book }) {
  const { t } = useI18n();
  const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(null);
  const hasPDF = !!book.pdf_url;
  const hasText = !!book.content?.trim();
  const hasAudio = !!book.audio_url;
  const srtCues = useMemo(() => parseSrtCues(book.srt_content), [book.srt_content]);

  const [mode, setMode] = useState<ReadMode>(hasText ? "text" : "pdf");
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_READING_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showPdfFullscreenPrompt, setShowPdfFullscreenPrompt] = useState(false);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState<FullscreenMode>("off");
  const [readerBarVisible, setReaderBarVisible] = useState(true);
  const lastScrollY = useRef(0);

  // ── Audio player state (when audio_url exists) ──
  const audioRafRef = useRef<number>(0);
  const audioSyncUnitsRef = useRef<AudioSyncUnit[]>([]);
  const audioTimedCuesRef = useRef<TimedSrtCue[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastAudioIdxRef = useRef(-1);
  const lastAudioCueIdxRef = useRef(-1);
  const isVoiceActiveRef = useRef(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrent, setAudioCurrent] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [pendingAudioStart, setPendingAudioStart] = useState(false);

  // ── TTS state (fallback when no audio_url) ──
  const [speaking, setSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [voiceName, setVoiceName] = useState("System voice");
  const speechLanguage = getSpeechLanguage(book.language);
  const audioOffset = book.audio_offset ?? 0;
  const setReaderRoot = useCallback((node: HTMLDivElement | null) => {
    setDialogContainer(node);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("readingSettings");
    if (!saved) return;
    const frame = requestAnimationFrame(() => {
      try { setSettings(normalizeSettings(JSON.parse(saved) as Partial<ReadingSettings>)); }
      catch { localStorage.removeItem("readingSettings"); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (document.fullscreenElement?.id === READER_FULLSCREEN_ID) { setFullscreenMode("native"); return; }
      setFullscreenMode((cur) => cur === "native" ? "off" : cur);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (fullscreenMode !== "off") document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [fullscreenMode]);

  useEffect(() => {
    if (!pendingAudioStart) return;
    const frame = requestAnimationFrame(() => {
      const audio = audioRef.current;
      if (audio) {
        audio.play();
        setAudioPlaying(true);
      }
      setPendingAudioStart(false);
    });

    return () => cancelAnimationFrame(frame);
  }, [pendingAudioStart]);

  // Keep isVoiceActiveRef in sync so scroll handler can read it without deps
  useEffect(() => {
    isVoiceActiveRef.current = audioPlaying || speaking;
    if (!audioPlaying && !speaking) {
      audioAutoScroll = true;
    }
  }, [audioPlaying, speaking]);

  // Reader topbar scroll-hide + auto-scroll pause on manual scroll
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) setReaderBarVisible(true);
      else if (y > lastScrollY.current + 4) setReaderBarVisible(false);
      else if (y < lastScrollY.current - 4) setReaderBarVisible(true);
      lastScrollY.current = y;

      // If voice/audio is active and user scrolls manually → pause auto-scroll for 3s
      if (isVoiceActiveRef.current && !audioProgrammaticScroll) {
        audioAutoScroll = false;
        if (_scrollResetTimer) clearTimeout(_scrollResetTimer);
        _scrollResetTimer = setTimeout(() => {
          audioAutoScroll = true;
        }, 3000);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // TTS voice init (only when no audio)
  useEffect(() => {
    if (hasAudio || !("speechSynthesis" in window)) return;
    const load = () => {
      const voice = getBestVoice(speechLanguage);
      if (voice) { setSelectedVoiceURI(voice.voiceURI); setVoiceName(voice.name); }
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [speechLanguage, hasAudio]);

  // Cleanup on unmount
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      stopSentenceSpeech();
      audio?.pause();
    };
  }, []);

  // Prebuild audio sync spans before playback so first play feels immediate.
  useEffect(() => {
    if (!hasAudio || !hasText || mode !== "text") return;
    if (audioTimedCuesRef.current.length || audioSyncUnitsRef.current.length) return;

    const frame = requestAnimationFrame(() => {
      const container = document.getElementById(READER_TTS_CONTENT_ID);
      if (!container) return;

      if (srtCues.length) {
        audioTimedCuesRef.current = prepareCueBoundedTimedCues(container, srtCues);
        if (!audioTimedCuesRef.current.some((cue) => cue.targetIds?.length)) {
          audioSyncUnitsRef.current = prepareAudioSyncUnits(container, speechLanguage);
          audioTimedCuesRef.current = mapSrtCuesToUnits(srtCues, audioSyncUnitsRef.current);
        }
        return;
      }

      audioSyncUnitsRef.current = prepareAudioSyncUnits(container, speechLanguage);
    });

    return () => cancelAnimationFrame(frame);
  }, [hasAudio, hasText, mode, speechLanguage, srtCues]);

  // Audio text tracking via rAF. SRT/VTT timing wins; sentence interpolation is fallback.
  useEffect(() => {
    if (!hasAudio || !audioPlaying) {
      cancelAnimationFrame(audioRafRef.current);
      if (!audioPlaying) {
        clearTtsHighlight();
      }
      return;
    }

    const container = document.getElementById(READER_TTS_CONTENT_ID);
    if (!container) return;

    if (!srtCues.length && audioSyncUnitsRef.current.length === 0) {
      audioSyncUnitsRef.current = prepareAudioSyncUnits(container, speechLanguage);
    }

    if (srtCues.length && audioTimedCuesRef.current.length === 0) {
      audioTimedCuesRef.current = prepareCueBoundedTimedCues(container, srtCues);

      if (!audioTimedCuesRef.current.some((cue) => cue.targetIds?.length)) {
        audioSyncUnitsRef.current = prepareAudioSyncUnits(container, speechLanguage);
        audioTimedCuesRef.current = mapSrtCuesToUnits(srtCues, audioSyncUnitsRef.current);
      }
    }

    const tick = () => {
      const a = audioRef.current;
      const units = audioSyncUnitsRef.current;
      if (!a || a.paused) return;

      const timedCues = audioTimedCuesRef.current;
      if (timedCues.length) {
        const start = book.audio_start ?? 0;
        const end = book.audio_end ?? 0;
        const effectiveEnd = end > 0 ? end : a.duration;
        const elapsed = Math.max(0, a.currentTime - start);
        const lastCueEnd = timedCues[timedCues.length - 1]?.end ?? 0;
        const cuesLookRelativeToTrim = start > 0 && lastCueEnd <= Math.max(1, effectiveEnd - start) + 2;
        const captionTime = Math.max(0, (cuesLookRelativeToTrim ? elapsed : a.currentTime) + audioOffset);
        const cueIndex = findActiveCueIndex(timedCues, captionTime, lastAudioCueIdxRef.current);

        if (cueIndex !== lastAudioCueIdxRef.current) {
          lastAudioCueIdxRef.current = cueIndex;
          const cue = timedCues[cueIndex];
          if (cue) {
            if (cue.targetIds?.length) activateTtsSentence(cue.targetIds);
          } else {
            clearTtsHighlight();
          }
        }
      } else if (units.length) {
        const start = book.audio_start ?? 0;
        const end = book.audio_end ?? 0;
        const effectiveEnd = end > 0 ? end : a.duration;
        const elapsed = Math.max(0, a.currentTime - start + audioOffset);
        const total = Math.max(1, effectiveEnd - start);
        const progress = elapsed / total;
        const idx = Math.min(Math.floor(progress * units.length), units.length - 1);
        if (idx !== lastAudioIdxRef.current) {
          lastAudioIdxRef.current = idx;
          activateTtsSentence([units[idx].id]);
        }
      }

      audioRafRef.current = requestAnimationFrame(tick);
    };

    audioRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(audioRafRef.current);
  }, [audioPlaying, hasAudio, speechLanguage, audioOffset, srtCues, book.audio_start, book.audio_end]);

  // Seek to audio_start when metadata loads
  const handleAudioMetadata = () => {
    const a = audioRef.current;
    if (!a) return;
    const start = book.audio_start ?? 0;
    const end = book.audio_end ?? 0;
    if (start > 0) a.currentTime = start;
    const effectiveEnd = end > 0 ? end : a.duration;
    setAudioDuration(Math.max(0, effectiveEnd - start));
  };

  // Stop at audio_end if set
  const handleAudioTimeUpdateWithTrim = () => {
    const a = audioRef.current;
    if (!a) return;
    const end = book.audio_end ?? 0;
    if (end > 0 && a.currentTime >= end) {
      a.pause();
      setAudioPlaying(false);
      return;
    }
    const start = book.audio_start ?? 0;
    const effectiveEnd = end > 0 ? end : a.duration;
    const elapsed = Math.max(0, a.currentTime - start);
    const total = Math.max(1, effectiveEnd - start);
    setAudioCurrent(elapsed);
    if (a.duration && isFinite(a.duration)) setAudioDuration(total);
  };

  const handleAudioEnded = () => {
    setAudioPlaying(false);
    cancelAnimationFrame(audioRafRef.current);
    clearTtsHighlight();
    const c = document.getElementById(READER_TTS_CONTENT_ID);
    if (c) unwrapReaderSyncUnits(c);
    audioSyncUnitsRef.current = [];
    audioTimedCuesRef.current = [];
    lastAudioIdxRef.current = -1;
    lastAudioCueIdxRef.current = -1;
    audioAutoScroll = true;
  };

  const toggleAudio = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (audioPlaying) { a.pause(); setAudioPlaying(false); }
    else { a.play(); setAudioPlaying(true); }
  }, [audioPlaying]);

  const openVoiceReader = useCallback(() => {
    setVoicePanelOpen(true);
    setFabOpen(false);
    setShowSettings(false);
    if (!hasAudio || audioPlaying) return;
    setPendingAudioStart(true);
  }, [audioPlaying, hasAudio]);

  const seekAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a || !audioDuration) return;
    const start = book.audio_start ?? 0;
    a.currentTime = start + (Number(e.target.value) / 100) * audioDuration;
    lastAudioIdxRef.current = -1;
    lastAudioCueIdxRef.current = -1;
  };

  const changeAudioSpeed = (speed: number) => {
    setAudioSpeed(speed);
    setSpeedMenuOpen(false);
    if (audioRef.current) audioRef.current.playbackRate = speed;
  };

  // TTS controls
  const stopTTS = useCallback(() => {
    stopSentenceSpeech();
    setVoiceLoading(false);
    setSpeaking(false);
  }, []);

  const startTTS = useCallback(() => {
    if (speaking) { stopTTS(); return; }
    if (!("speechSynthesis" in window)) return;
    const container = document.getElementById(READER_TTS_CONTENT_ID);
    if (!container) return;
    setVoiceLoading(true);
    const sentences = prepareTtsSentences(container, speechLanguage);
    if (sentences.length === 0) { setVoiceLoading(false); return; }
    const startIndex = getStartSentenceIndex(sentences);
    const runId = ttsRunId + 1;
    ttsRunId = runId;
    ttsSentences = sentences;
    window.speechSynthesis.cancel();
    const voiceURI = selectedVoiceURI || undefined;
    window.setTimeout(() => {
      if (runId !== ttsRunId) return;
      setVoiceLoading(false);
      setSpeaking(true);
      speakSentenceAt(startIndex, speechLanguage, voiceURI, runId, () => {
        ttsSentences = [];
        setSpeaking(false);
      });
    }, 220);
  }, [speaking, selectedVoiceURI, speechLanguage, stopTTS]);

  const saveSettings = (s: ReadingSettings) => {
    const next = normalizeSettings(s);
    setSettings(next);
    localStorage.setItem("readingSettings", JSON.stringify(next));
  };

  const toggleSettings = useCallback(() => {
    setShowSettings((open) => !open);
    setFabOpen(false);
  }, []);

  const enterReaderFullscreen = useCallback(async () => {
    const target = document.getElementById(READER_FULLSCREEN_ID);
    if (!target?.requestFullscreen) {
      setFullscreenMode("fallback");
      setFabOpen(false);
      setShowSettings(false);
      setShowPdfFullscreenPrompt(false);
      return;
    }
    try { await target.requestFullscreen(); setFullscreenMode("native"); }
    catch { setFullscreenMode("fallback"); }
    setFabOpen(false);
    setShowSettings(false);
    setShowPdfFullscreenPrompt(false);
  }, []);

  const exitReaderFullscreen = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    setFullscreenMode("off");
    setFabOpen(false);
    setShowPdfFullscreenPrompt(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (fullscreenMode !== "off") {
      await exitReaderFullscreen();
      return;
    }
    await enterReaderFullscreen();
  }, [enterReaderFullscreen, exitReaderFullscreen, fullscreenMode]);

  const switchReaderMode = useCallback(() => {
    setFabOpen(false);
    if (mode === "pdf") {
      setShowPdfFullscreenPrompt(false);
      setMode("text");
      return;
    }
    setMode("pdf");
    setShowSettings(false);
    if (fullscreenMode === "off") setShowPdfFullscreenPrompt(true);
  }, [fullscreenMode, mode]);

  if (!hasPDF && !hasText) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ color: "var(--muted)" }}>
        <BookOpen size={48} className="opacity-30" />
        <p className="text-lg">{t("reader.noContent")}</p>
        <Link href={`/books/${book.id}`} className="text-sm underline" style={{ color: "var(--accent)" }}>{t("reader.back")}</Link>
      </div>
    );
  }

  const theme = READING_THEMES[settings.theme];
  const themeTokens = READER_THEME_TOKENS[settings.theme];
  const isFullscreen = fullscreenMode !== "off";
  const voicePanelVisible = voicePanelOpen || speaking || voiceLoading || audioPlaying;

  const readerPageClassName = [
    "reader-page min-h-screen flex flex-col",
    mode === "pdf" ? "reader-page--pdf" : "",
    isFullscreen ? "reader-page--fullscreen" : "",
    showSettings ? "reader-page--settings-open" : "",
    voicePanelVisible ? "reader-page--voice-open" : "",
  ].filter(Boolean).join(" ");

  const fabActions: FabAction[] = [
    {
      icon: isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />,
      label: isFullscreen ? t("reader.exitFullscreen") : t("reader.fullscreen"),
      onClick: () => { toggleFullscreen(); setFabOpen(false); },
      show: true,
    },
    {
      icon: <Settings size={18} />,
      label: t("reader.settings"),
      onClick: toggleSettings,
      active: showSettings,
      show: mode === "text" && !speaking,
    },
    {
      icon: (speaking || audioPlaying) ? <MicOff size={18} /> : <Mic size={18} />,
      label: hasAudio ? t("reader.listenAudio") : t("reader.voiceRead"),
      onClick: openVoiceReader,
      active: speaking || voicePanelOpen || audioPlaying,
      show: mode === "text" && hasText,
    },
    {
      icon: mode === "pdf" ? <BookOpen size={18} /> : <FileText size={18} />,
      label: mode === "pdf" ? t("reader.article") : t("reader.pdf"),
      onClick: switchReaderMode,
      show: hasPDF && hasText && !speaking,
    },
    {
      icon: <ExternalLink size={18} />,
      label: t("reader.openPdf"),
      href: book.pdf_url ?? "",
      show: mode === "pdf" && hasPDF,
    },
  ].filter((a) => a.show);

  const fullscreenActions: FabAction[] = [
    {
      icon: (speaking || audioPlaying) ? <MicOff size={18} /> : <Mic size={18} />,
      label: hasAudio ? t("reader.listenAudio") : t("reader.voiceRead"),
      onClick: openVoiceReader,
      active: speaking || voicePanelOpen || audioPlaying,
      show: mode === "text" && hasText,
    },
    {
      icon: <Settings size={18} />,
      label: t("reader.settings"),
      onClick: toggleSettings,
      active: showSettings,
      show: mode === "text" && !speaking,
    },
    {
      icon: mode === "pdf" ? <BookOpen size={18} /> : <FileText size={18} />,
      label: mode === "pdf" ? t("reader.article") : t("reader.pdf"),
      onClick: switchReaderMode,
      show: hasPDF && hasText && !speaking,
    },
    {
      icon: <Minimize size={18} />,
      label: t("reader.exitFullscreen"),
      onClick: toggleFullscreen,
      show: true,
    },
  ].filter((a) => a.show);

  const mobileDockActions: FabAction[] = [
    {
      icon: <ArrowLeft size={18} />,
      label: t("reader.back"),
      href: `/books/${book.id}`,
      show: true,
    },
    {
      icon: (speaking || audioPlaying) ? <MicOff size={18} /> : <Mic size={18} />,
      label: hasAudio ? t("reader.listenAudio") : t("reader.voiceRead"),
      onClick: openVoiceReader,
      active: speaking || voicePanelOpen || audioPlaying,
      show: mode === "text" && hasText,
    },
    {
      icon: <Settings size={18} />,
      label: t("reader.settings"),
      onClick: toggleSettings,
      active: showSettings,
      show: mode === "text" && !speaking,
    },
    {
      icon: mode === "pdf" ? <BookOpen size={18} /> : <FileText size={18} />,
      label: mode === "pdf" ? t("reader.article") : t("reader.pdf"),
      onClick: switchReaderMode,
      show: hasPDF && hasText && !speaking,
    },
    {
      icon: isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />,
      label: isFullscreen ? t("reader.exitFullscreen") : t("reader.fullscreen"),
      onClick: toggleFullscreen,
      active: isFullscreen,
      show: true,
    },
  ].filter((a) => a.show);

  const audioProgress = audioDuration > 0 ? (audioCurrent / audioDuration) * 100 : 0;
  const isSettingsFabAction = (action: FabAction) => action.label === t("reader.settings");
  const getFabActionStyle = (action: FabAction, showExitAccent = false) => {
    if (isSettingsFabAction(action)) {
      return {
        background: action.active ? "#2563eb" : "rgba(37, 99, 235, 0.14)",
        color: action.active ? "#fff" : "#2563eb",
        border: `1px solid ${action.active ? "#2563eb" : "rgba(37, 99, 235, 0.28)"}`,
      };
    }

    return {
      background: action.active ? "var(--accent)" : "var(--bg-card)",
      color: action.active ? "#fff" : "var(--foreground)",
      border: showExitAccent && action.label === t("reader.exitFullscreen")
        ? "1px solid var(--accent)"
        : "1px solid var(--border)",
    };
  };
  return (
    <div
      ref={setReaderRoot}
      id={READER_FULLSCREEN_ID}
      className={readerPageClassName}
      style={{
        background: mode === "pdf" ? "var(--bg)" : theme.bg,
        color: mode === "pdf" ? "var(--foreground)" : theme.text,
        "--reader-sync-active-bg": themeTokens.syncBg,
        "--reader-sync-active-shadow": themeTokens.syncShadow,
        "--reader-prose-text": theme.text,
        "--reader-prose-mark-bg": themeTokens.proseMarkBg,
        "--reader-prose-mark-text": themeTokens.proseMarkText,
        "--reader-prose-link": themeTokens.proseLink,
        "--reader-prose-blockquote-bg": themeTokens.proseBlockquoteBg,
        "--reader-prose-blockquote-text": themeTokens.proseBlockquoteText,
        "--reader-prose-blockquote-border": themeTokens.proseBlockquoteBorder,
      } as React.CSSProperties}
    >
      {/* Hidden audio element */}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={book.audio_url}
          preload="auto"
          playsInline
          onTimeUpdate={handleAudioTimeUpdateWithTrim}
          onLoadedMetadata={handleAudioMetadata}
          onEnded={handleAudioEnded}
          onPause={() => setAudioPlaying(false)}
          onPlay={() => setAudioPlaying(true)}
        />
      )}

      {/* Top toolbar — fixed, hides on scroll-down with navbar */}
      <div
        className="reader-topbar fixed left-0 right-0 z-40 flex items-center gap-2 px-4 py-2 shadow-sm"
        style={{
          top: "4rem",
          background: "var(--bg-nav)",
          borderBottom: "1px solid var(--border)",
          transform: readerBarVisible ? "translateY(0)" : "translateY(calc(-100% - 4rem))",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <Link href={`/books/${book.id}`} className="flex items-center gap-1 text-sm shrink-0" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={16} />
        </Link>
        <h1 className="min-w-0 text-sm font-semibold truncate flex-1" style={{ color: "var(--foreground)" }}>
          {book.title_kh || book.title}
        </h1>
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0" style={{ background: "var(--accent)", color: "#fff", opacity: 0.85 }}>
          {mode === "pdf" ? t("reader.pdf") : t("reader.article")}
        </span>
      </div>

      {/* Spacer for fixed reader topbar */}
      <div className="reader-topbar shrink-0" aria-hidden="true" />

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent
          className="reader-settings-dialog"
          container={dialogContainer}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <ReadingSettingsPanel settings={settings} onChange={saveSettings} />
        </DialogContent>
      </Dialog>

      {showPdfFullscreenPrompt && mode === "pdf" && fullscreenMode === "off" && (
        <div
          className="reader-fullscreen-prompt-overlay"
          onClick={() => setShowPdfFullscreenPrompt(false)}
        >
          <div className="reader-fullscreen-prompt" onClick={(event) => event.stopPropagation()}>
            <div className="reader-fullscreen-prompt-icon">
              <Maximize size={22} />
            </div>
            <div className="reader-fullscreen-prompt-copy">
              <p className="reader-fullscreen-prompt-title">{t("reader.fullscreenPromptTitle")}</p>
              <p className="reader-fullscreen-prompt-text">{t("reader.fullscreenPromptText")}</p>
            </div>
            <div className="reader-fullscreen-prompt-actions">
              <button type="button" className="reader-fullscreen-prompt-secondary" onClick={() => setShowPdfFullscreenPrompt(false)}>
                {t("reader.notNow")}
              </button>
              <button type="button" className="reader-fullscreen-prompt-primary" onClick={enterReaderFullscreen}>
                {t("reader.fullscreen")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`reader-content flex-1 ${mode === "pdf" ? "reader-content--pdf" : "reader-content--text"}`}>
        {mode === "pdf" && hasPDF ? (
          <PDFReader url={book.pdf_url!} />
        ) : hasText ? (
          <div className="reader-text-stage">
            <PinchZoom className="reader-markdown-zoom" minScale={1} maxScale={4}>
              <div className="reader-markdown-flow">
              {book.cover_url && (
                <div className="reader-cover">
                  <Image src={book.cover_url} alt={book.title_kh || book.title} width={200} height={280}
                    className="reader-cover-image rounded-xl shadow-lg object-cover" />
                </div>
              )}
              <div id={READER_TTS_CONTENT_ID} className="reader-tts-content">
                <MarkdownReader content={book.content!} settings={settings} />
              </div>
              </div>
            </PinchZoom>
          </div>
        ) : (
          <div className="flex items-center justify-center py-24" style={{ color: "var(--muted)" }}>
            <p>{t("reader.noContent")}</p>
          </div>
        )}
      </div>

      {/* ── Glass floating player ──────────────────────── */}
      {voicePanelVisible && mode === "text" && hasText && (
        <div className={`glass-player ${hasAudio ? "glass-player--compact" : ""}`}>
          {hasAudio ? (
            <>
              {/* Progress bar */}
              <div className="glass-progress-row">
                <input
                  type="range"
                  className="glass-player-progress"
                  min={0} max={100} step={0.1}
                  value={audioProgress}
                  style={{ "--pct": `${audioProgress}%` } as React.CSSProperties}
                  onChange={seekAudio}
                />
                <button
                  type="button"
                  onClick={() => { audioRef.current?.pause(); setAudioPlaying(false); setVoicePanelOpen(false); }}
                  className="glass-close-btn"
                  aria-label="Close voice player"
                >
                  <X size={13} />
                </button>
              </div>
              <div className="glass-player-time" style={{ color: "var(--muted)" }}>
                <span>{fmtTime(audioCurrent)}</span>
                <span>{fmtTime(audioDuration)}</span>
              </div>

              {/* Controls row: speed | play | wave */}
              <div className="glass-audio-controls">
                <div className="glass-speed-menu">
                  <button
                    type="button"
                    className="glass-speed-trigger"
                    onClick={() => setSpeedMenuOpen((open) => !open)}
                    aria-label="Playback speed"
                    aria-expanded={speedMenuOpen}
                  >
                    <span>{audioSpeed}x</span>
                    <ChevronDown size={13} />
                  </button>
                  {speedMenuOpen && (
                    <div className="glass-speed-popover">
                      {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`glass-speed-option ${audioSpeed === s ? "glass-speed-option--active" : ""}`}
                          onClick={() => changeAudioSpeed(s)}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" className={`glass-play-btn glass-play-btn--voice ${audioPlaying ? "glass-play-btn--active" : ""}`} onClick={toggleAudio}>
                  {audioPlaying ? <Pause size={22} /> : <Play size={22} />}
                </button>
                <div className={`glass-wave glass-wave--ai ${audioPlaying ? "glass-wave--active" : ""}`} aria-hidden="true">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span key={i} style={{ animationDelay: `${i * 58}ms` }} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* TTS glass player */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{ background: "var(--accent-light)" }}>
                  <Volume2 size={22} style={{ color: "var(--accent)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{t("reader.voiceReader")}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                    {speechLanguage === "km-KH" ? "ខ្មែរ" : "English"} · {voiceName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { stopTTS(); setVoicePanelOpen(false); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--border)", color: "var(--muted)" }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className={`glass-wave mb-4 justify-center ${(speaking || voiceLoading) ? "glass-wave--active" : ""}`} aria-hidden="true">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} style={{ animationDelay: `${i * 55}ms` }} />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                  {voiceLoading ? t("reader.preparing") : speaking ? t("reader.readingAloud") : t("reader.readyToRead")}
                </p>
                <button type="button" className="glass-play-btn"
                  onClick={speaking || voiceLoading ? stopTTS : startTTS}>
                  {speaking || voiceLoading ? <MicOff size={20} /> : <Play size={20} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <nav className="reader-mobile-dock" aria-label="Reader tools">
        {mobileDockActions.map((action) => {
          const className = `reader-mobile-dock-btn ${action.active ? "reader-mobile-dock-btn--active" : ""}`;
          const href = "href" in action ? action.href : undefined;
          if (href) {
            return (
              <Link
                key={action.label}
                href={href}
                className={className}
                aria-label={action.label}
                title={action.label}
              >
                {action.icon}
              </Link>
            );
          }

          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={className}
              aria-label={action.label}
              title={action.label}
            >
              {action.icon}
            </button>
          );
        })}
      </nav>

      {/* FAB Speed Dial */}
      <div className="reader-fab fixed z-50 flex flex-col items-end gap-2">
        {isFullscreen ? (
          <div className="reader-fab-menu reader-fab-menu--fullscreen flex flex-col items-end gap-2">
            {fullscreenActions.map((action) => {
              const s = getFabActionStyle(action, true);
              const className = `reader-fab-icon-action shadow-lg transition-all active:scale-95 ${
                isSettingsFabAction(action) ? "reader-fab-icon-action--settings" : ""
              } ${action.active ? "reader-fab-icon-action--active" : ""}`;
              if ("href" in action) {
                return (
                  <a key={action.label} href={action.href} target="_blank" rel="noreferrer"
                    className={className}
                    style={s}
                    title={action.label}
                    aria-label={action.label}>
                    {action.icon}
                  </a>
                );
              }
              return (
                <button key={action.label} type="button" onClick={action.onClick}
                  className={className}
                  style={s}
                  title={action.label}
                  aria-label={action.label}>
                  {action.icon}
                </button>
              );
            })}
          </div>
        ) : fabOpen && (
          <div className="reader-fab-menu flex flex-col items-end gap-2">
            {fabActions.map((action) => {
              const s = getFabActionStyle(action);
              const className = `reader-fab-action shadow-lg transition-all active:scale-95 ${
                isSettingsFabAction(action) ? "reader-fab-action--settings" : ""
              } ${action.active ? "reader-fab-action--active" : ""}`;
              if ("href" in action) {
                return (
                  <a key={action.label} href={action.href} target="_blank" rel="noreferrer"
                    className={className} style={s}>
                    {action.icon}<span>{action.label}</span>
                  </a>
                );
              }
              return (
                <button key={action.label} type="button" onClick={action.onClick}
                  className={className} style={s}>
                  {action.icon}<span>{action.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {!isFullscreen && (
          <button
            type="button"
            onClick={() => setFabOpen(!fabOpen)}
            className="reader-fab-main rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95"
            style={{
              background: "var(--accent)", color: "#fff",
              transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
              transition: "transform 200ms ease, background 200ms ease",
            }}
          >
            {fabOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
      </div>

      {fabOpen && !isFullscreen && (
        <div className="fixed inset-0 z-40" onClick={() => setFabOpen(false)} />
      )}
    </div>
  );
}
