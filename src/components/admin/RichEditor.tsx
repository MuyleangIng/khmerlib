"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import MarkdownReader from "@/components/reader/MarkdownReader";
import { uploadAdminFile } from "@/lib/admin-upload-client";
import { DEFAULT_READING_SETTINGS } from "@/lib/types";
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Code, Quote,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  ImageIcon, LinkIcon, Heading1, Heading2, Heading3,
  Eye, PenLine, Highlighter, Undo, Redo, Minus,
  Sparkles, ClipboardPaste,
} from "lucide-react";

interface RichEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  name?: string;
}

interface PendingPaste {
  plain: string;
  html: string;
}

export default function RichEditor({ value = "", onChange, name = "content" }: RichEditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const [pendingPaste, setPendingPaste] = useState<PendingPaste | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ HTMLAttributes: { class: "rich-img" } }),
      Placeholder.configure({ placeholder: "ចាប់ផ្តើមសរសេររឿង..." }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (hiddenRef.current) hiddenRef.current.value = html;
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: "rich-editor-body",
        style: [
          "background:#ffffff",
          "color:#1a1a1a",
          "min-height:500px",
          "padding:24px 32px",
          "outline:none",
          "font-size:1.05rem",
          "line-height:2",
        ].join(";"),
      },
      handlePaste: (_view, event) => {
        const html = event.clipboardData?.getData("text/html") ?? "";
        const plain = event.clipboardData?.getData("text/plain") ?? "";

        // Only intercept if there's actual HTML formatting from external source
        if (html && html.includes("<") && plain.trim().length > 0) {
          event.preventDefault();
          setPendingPaste({ plain, html });
          return true;
        }
        return false; // let TipTap handle plain text paste normally
      },
    },
  });

  const insertClean = () => {
    if (!pendingPaste || !editor) return;
    const cleaned = pendingPaste.plain
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => `<p>${l}</p>`)
      .join("");
    editor.chain().focus().insertContent(cleaned, {
      parseOptions: { preserveWhitespace: false },
    }).run();
    setPendingPaste(null);
  };

  const insertRaw = () => {
    if (!pendingPaste || !editor) return;
    editor.chain().focus().insertContent(pendingPaste.html, {
      parseOptions: { preserveWhitespace: "full" },
    }).run();
    setPendingPaste(null);
  };

  // Upload image to R2 via API
  const uploadImage = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAdminFile(file, "content-images");
      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run();
      } else {
        throw new Error("Image upload did not return a URL");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }, [editor]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) uploadImage(file);
  }, [uploadImage]);

  const setLink = () => {
    const url = window.prompt("URL:");
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  };

  if (!editor) return null;

  const btn = (active: boolean) => ({
    padding: "5px 7px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--foreground)",
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties);

  const divider = <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--bg-card)", position: "relative" }}>
      <input type="hidden" name={name} ref={hiddenRef} defaultValue={value} />

      {/* ── Paste confirm dialog ───────────────────── */}
      {pendingPaste && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            borderRadius: 14,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "28px 32px",
              maxWidth: 380,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>
              រកឃើញការបិទភ្ជាប់ · Paste Detected
            </h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.6 }}>
              មាតិកានេះមានទម្រង់ (bold, color, font…)
              <br />
              តើអ្នកចង់សម្អាតវាទេ?
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={insertClean}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--accent, #c8502a)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={15} />
                សម្អាត (Clean)
              </button>
              <button
                type="button"
                onClick={insertRaw}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "2px solid #e5e7eb",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <ClipboardPaste size={15} />
                ដដែល (Keep)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPendingPaste(null)}
              style={{ marginTop: 12, fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}
            >
              បោះបង់
            </button>
          </div>
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "var(--sidebar-bg)" }}>
        <button type="button" style={btn(false)} onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo size={15} /></button>
        <button type="button" style={btn(false)} onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo size={15} /></button>
        {divider}
        <button type="button" style={btn(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={15} /></button>
        <button type="button" style={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></button>
        <button type="button" style={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></button>
        {divider}
        <button type="button" style={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></button>
        <button type="button" style={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></button>
        <button type="button" style={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></button>
        <button type="button" style={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></button>
        <button type="button" style={btn(editor.isActive("highlight"))} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={15} /></button>
        {divider}
        <button type="button" style={btn(editor.isActive({ textAlign: "left" }))} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={15} /></button>
        <button type="button" style={btn(editor.isActive({ textAlign: "center" }))} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={15} /></button>
        <button type="button" style={btn(editor.isActive({ textAlign: "right" }))} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={15} /></button>
        {divider}
        <button type="button" style={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></button>
        <button type="button" style={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></button>
        {divider}
        <button type="button" style={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></button>
        <button type="button" style={btn(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()}><Code size={15} /></button>
        <button type="button" style={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></button>
        {divider}
        <button type="button" style={btn(editor.isActive("link"))} onClick={setLink}><LinkIcon size={15} /></button>
        <button type="button" style={{ ...btn(false), opacity: uploading ? 0.5 : 1 }} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <span style={{ fontSize: 11 }}>…</span> : <ImageIcon size={15} />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setMode(mode === "write" ? "preview" : "write")}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)", background: mode === "preview" ? "var(--accent)" : "var(--bg)", color: mode === "preview" ? "#fff" : "var(--muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {mode === "preview" ? <PenLine size={14} /> : <Eye size={14} />}
          {mode === "preview" ? "Edit" : "Preview"}
        </button>
      </div>

      {/* ── Editor / Preview ──────────────────────── */}
      <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} style={{ minHeight: 500 }}>
        {mode === "write" ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="rich-preview" style={{ padding: "24px 32px", minHeight: 500, color: "#1a1a1a" }}>
            <MarkdownReader content={editor.getHTML()} settings={DEFAULT_READING_SETTINGS} />
          </div>
        )}
      </div>

      {/* Word count */}
      <div style={{ padding: "6px 16px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--muted)", textAlign: "right" }}>
        {editor.getText().split(/\s+/).filter(Boolean).length} words
      </div>
    </div>
  );
}
