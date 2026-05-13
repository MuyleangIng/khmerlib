"use client";
import { memo } from "react";
import { ReadingSettings } from "@/lib/types";
import { KHMER_FONTS } from "@/lib/fonts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Strip [cite start], [cite: 115. 117], [cite_end], etc.
function stripCiteTags(text: string): string {
  return text.replace(/\[cite[^\]]*\]/gi, "").replace(/\s{2,}/g, " ");
}

// Detect if content is raw markdown or TipTap HTML
function isMarkdown(content: string): boolean {
  const text = content.trim();
  return (
    text.startsWith("#") ||
    /^#{1,6}\s/m.test(text) ||
    /^>\s/m.test(text) ||
    /^\*\s/m.test(text) ||
    /^-\s/m.test(text) ||
    /^\d+\.\s/m.test(text) ||
    /!\[[^\]]*]\([^)]+\)/m.test(text) ||
    // Also check if it's HTML with paragraphs containing # (TipTap stored markdown as HTML)
    /<p>\s*#{1,6}\s/.test(text) ||
    /<p>\s*!\[[^\]]*]\([^)]+\)/.test(text)
  );
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function getHtmlAttribute(attrs: string, name: string): string {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = attrs.match(pattern);
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

// Strip HTML tags to extract plain markdown text
function htmlToMarkdown(html: string): string {
  return html
    .replace(/<img\b([^>]*)>/gi, (_tag, attrs: string) => {
      const src = getHtmlAttribute(attrs, "src");
      if (!src) return "";
      const alt = getHtmlAttribute(attrs, "alt");
      return `\n\n![${alt}](${src})\n\n`;
    })
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<u>(.*?)<\/u>/gi, "$1")
    .replace(/<h1>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3>(.*?)<\/h3>/gi, "### $1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function MarkdownReader({
  content,
  settings,
}: {
  content: string;
  settings: ReadingSettings;
}) {
  const fontId = settings.fontFamily ?? "kantumruy-pro";
  const font = KHMER_FONTS.find((f) => f.id === fontId) ?? KHMER_FONTS[0];

  const style: React.CSSProperties = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: 2,
    fontFamily: `"${font.google}", system-ui, sans-serif`,
    color: "inherit",
  };

  // Decide render strategy
  const cleaned = stripCiteTags(content);
  const useMarkdown = isMarkdown(cleaned);
  const markdownText = useMarkdown ? htmlToMarkdown(cleaned) : null;

  if (useMarkdown && markdownText) {
    return (
      <div className="rich-preview max-w-none" style={style}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 style={{ fontSize: "1.8em", fontWeight: 800, margin: "1em 0 0.4em", fontFamily: `"${font.google}", system-ui` }}>{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 style={{ fontSize: "1.4em", fontWeight: 700, margin: "1em 0 0.3em", fontFamily: `"${font.google}", system-ui` }}>{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 style={{ fontSize: "1.2em", fontWeight: 700, margin: "0.8em 0 0.3em", fontFamily: `"${font.google}", system-ui` }}>{children}</h3>
            ),
            p: ({ children }) => (
              <p style={{ marginBottom: "1em", fontFamily: `"${font.google}", system-ui` }}>{children}</p>
            ),
            blockquote: ({ children }) => (
              <blockquote>{children}</blockquote>
            ),
          }}
        >
          {markdownText}
        </ReactMarkdown>
      </div>
    );
  }

  // Pure HTML from TipTap
  return (
    <div
      className="rich-preview max-w-none"
      style={style}
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
}

export default memo(MarkdownReader);
