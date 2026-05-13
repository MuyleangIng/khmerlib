"use client";
import { useState, useRef } from "react";
import { CATEGORIES } from "@/lib/types";
import { formatTagListInput } from "@/lib/tags";
import { uploadAdminFile } from "@/lib/admin-upload-client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Image as ImageIcon, Save, Loader2, Mic, Play, Pause, ExternalLink } from "lucide-react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";

const RichEditor = dynamic(() => import("./RichEditor"), { ssr: false });

interface SaveReview {
  title: string;
  willPublish: boolean;
  contentMode: "markdown" | "pdf";
  pendingUploads: string[];
}

export default function BookForm({ book }: { book?: Record<string, unknown> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveReview, setSaveReview] = useState<SaveReview | null>(null);
  const [srtFileName, setSrtFileName] = useState<string>(
    (book?.srt_file_name as string) ?? ((book?.srt_content as string) ? "Existing subtitle file" : "")
  );
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>(
    (book?.audio_url as string) ?? ""
  );
  const previewRef = useRef<HTMLAudioElement>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [audioStart, setAudioStart] = useState<number>((book?.audio_start as number) ?? 0);
  const [audioEnd, setAudioEnd] = useState<number>((book?.audio_end as number) ?? 0);
  const [audioOffset, setAudioOffset] = useState<number>((book?.audio_offset as number) ?? 0);

  const fmtTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const togglePreview = () => {
    const a = previewRef.current;
    if (!a) return;
    if (previewPlaying) { a.pause(); setPreviewPlaying(false); }
    else { a.play(); setPreviewPlaying(true); }
  };

  const seekPreview = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = previewRef.current;
    if (!a || !previewDuration) return;
    a.currentTime = (Number(e.target.value) / 100) * previewDuration;
  };

  const previewProgress = previewDuration > 0 ? (previewTime / previewDuration) * 100 : 0;
  const [coverPreview, setCoverPreview] = useState<string>(
    (book?.cover_url as string) ?? ""
  );
  const [editorContent, setEditorContent] = useState<string>(
    (book?.content as string) ?? ""
  );

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const parseJsonSafely = async (res: Response): Promise<Record<string, unknown> | null> => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const openSaveDialog = () => {
    const formEl = formRef.current;
    if (!formEl || loading) return;

    const form = new FormData(formEl);
    const titleKh = (form.get("title_kh") as string)?.trim() || "";
    const titleEn = (form.get("title") as string)?.trim() || "";
    const title = titleKh || titleEn || "Untitled book";
    const hasPDF = !!(pdfFile || (book?.pdf_url as string));
    const hasText = editorContent.trim().length > 0;

    const pendingUploads = [
      coverFile ? `Cover image: ${coverFile.name}` : "",
      pdfFile ? `PDF file: ${pdfFile.name}` : "",
      audioFile ? `Audio file: ${audioFile.name}` : "",
      srtFile ? `Subtitle file: ${srtFile.name}` : "",
    ].filter(Boolean);

    setSaveReview({
      title,
      willPublish: form.get("is_published") === "on",
      contentMode: hasText ? "markdown" : hasPDF ? "pdf" : "markdown",
      pendingUploads,
    });
    setSaveDialogOpen(true);
  };

  const confirmSave = () => {
    setSaveDialogOpen(false);
    formRef.current?.requestSubmit();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading(book?.id ? "កំពុងរក្សាទុក..." : "កំពុងបន្ថែម...");
    try {
      const form = new FormData(e.currentTarget);
      if (srtFile) form.set("srt_file", srtFile);

      if (coverFile) {
        toast.loading("កំពុងផ្ទុករូបភាពប្រអប់...", { id: toastId });
        form.set("cover_url", await uploadAdminFile(coverFile, "covers"));
      }

      if (pdfFile) {
        toast.loading("កំពុងផ្ទុក PDF...", { id: toastId });
        form.set("pdf_url", await uploadAdminFile(pdfFile, "pdfs"));
      }

      if (audioFile) {
        toast.loading("កំពុងផ្ទុកសំឡេង...", { id: toastId });
        form.set("audio_url", await uploadAdminFile(audioFile, "audio"));
      }

      form.set("audio_start", String(audioStart));
      form.set("audio_end", String(audioEnd));
      form.set("audio_offset", String(audioOffset));
      // Always send editor content from state
      form.set("content", editorContent);

      // Determine content_type: if has text content → markdown (reader can toggle to PDF too)
      // if no text but has PDF → pdf
      const hasPDF = !!(pdfFile || (book?.pdf_url as string));
      const hasText = editorContent.trim().length > 0;
      form.set("content_type", hasText ? "markdown" : hasPDF ? "pdf" : "markdown");

      const url = book?.id ? `/api/admin/books/${book.id}` : "/api/admin/books";
      const method = book?.id ? "PUT" : "POST";

      toast.loading(book?.id ? "កំពុងរក្សាទុកទិន្នន័យ..." : "កំពុងបង្កើតសៀវភៅ...", { id: toastId });
      const res = await fetch(url, { method, body: form });
      const data = await parseJsonSafely(res.clone());

      if (res.ok && data?.id) {
        toast.success(book?.id ? "✅ រក្សាទុកបានជោគជ័យ!" : "✅ បន្ថែមសៀវភៅថ្មីបានជោគជ័យ!", { id: toastId });
        setTimeout(() => { window.location.href = "/admin"; }, 800);
      } else {
        const fallback = await res.text().catch(() => "");
        const message =
          typeof data?.error === "string"
            ? data.error
            : fallback.trim() || "Failed to save book";
        toast.error(`❌ ${message}`, { id: toastId });
      }
    } catch (err) {
      toast.error(`❌ មានបញ្ហា: ${err instanceof Error ? err.message : "Unknown error"}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: "600" as const,
    marginBottom: "6px",
    color: "var(--muted)",
  };

  return (
    <>
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent
          className="max-w-md border-0 p-0 overflow-hidden"
          style={{ background: "var(--bg-card)", color: "var(--foreground)" }}
        >
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-left">Confirm Save</DialogTitle>
            <DialogDescription className="text-left">
              Review this book before saving and uploading files.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-4">
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                  Title
                </div>
                <div className="mt-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {saveReview?.title ?? "Untitled book"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div
                  className="rounded-xl px-3 py-2"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div style={{ color: "var(--muted)" }}>Status</div>
                  <div className="font-semibold" style={{ color: "var(--foreground)" }}>
                    {saveReview?.willPublish ? "Publish now" : "Draft only"}
                  </div>
                </div>
                <div
                  className="rounded-xl px-3 py-2"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div style={{ color: "var(--muted)" }}>Reader mode</div>
                  <div className="font-semibold" style={{ color: "var(--foreground)" }}>
                    {saveReview?.contentMode === "markdown" ? "Text / Markdown" : "PDF"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] mb-2" style={{ color: "var(--muted)" }}>
                  Pending uploads
                </div>
                {saveReview?.pendingUploads.length ? (
                  <div className="space-y-2">
                    {saveReview.pendingUploads.map((item) => (
                      <div
                        key={item}
                        className="rounded-xl px-3 py-2 text-sm"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl px-3 py-2 text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                    No new file uploads. Existing assets will be kept.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => setSaveDialogOpen(false)}
                className="px-5 py-3 rounded-xl font-semibold text-sm border transition hover:opacity-80"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSave}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition hover:opacity-90"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                <Save size={16} />
                Confirm Save
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">

      {/* Basic info */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="font-bold" style={{ color: "var(--foreground)" }}>ព័ត៌មានទូទៅ</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>ចំណងជើង (ខ្មែរ)</label>
            <input name="title_kh" defaultValue={book?.title_kh as string} style={inputStyle} placeholder="ចំណងជើងជាភាសាខ្មែរ" />
          </div>
          <div>
            <label style={labelStyle}>Title (English)</label>
            <input name="title" required defaultValue={book?.title as string} style={inputStyle} placeholder="English title" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label style={labelStyle}>អ្នកនិពន្ធ</label>
            <input name="author" defaultValue={book?.author as string} style={inputStyle} placeholder="ឈ្មោះអ្នកនិពន្ធ" />
          </div>
          <div>
            <label style={labelStyle}>បោះពុម្ព</label>
            <input name="publisher" defaultValue={book?.publisher as string} style={inputStyle} placeholder="ឈ្មោះបោះពុម្ព" />
          </div>
          <div>
            <label style={labelStyle}>ឆ្នាំបោះពុម្ព</label>
            <input name="published_year" type="number" defaultValue={book?.published_year as number} style={inputStyle} placeholder="2025" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>ប្រភេទ</label>
            <select name="category" required defaultValue={(book?.category as string) ?? "general"} style={{ ...inputStyle }}>
              {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.labelKh}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>ភាសា</label>
            <select name="language" defaultValue={(book?.language as string) ?? "km"} style={{ ...inputStyle }}>
              <option value="km">ភាសាខ្មែរ</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="zh">中文</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>ស្លាក (Tags) — ចុច Enter ដើម្បីបំបែក</label>
          <input
            name="tags"
            defaultValue={formatTagListInput(book?.tags)}
            style={inputStyle}
            placeholder="រឿងនិទាន, ប្រវត្តិ, ..."
          />
        </div>

        <div>
          <label style={labelStyle}>សង្ខេប</label>
          <textarea
            name="description"
            defaultValue={book?.description as string}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="ពិពណ៌នាអំពីសៀវភៅ..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_published"
            id="is_published"
            defaultChecked={book?.is_published !== 0}
            className="w-4 h-4 accent-orange-500"
          />
          <label htmlFor="is_published" className="text-sm" style={{ color: "var(--foreground)" }}>
            បោះពុម្ភភ្លាម (Publish)
          </label>
        </div>
      </div>

      {/* Cover image upload */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="font-bold mb-4" style={{ color: "var(--foreground)" }}>រូបភាពប្រអប់</h2>
        <div className="flex gap-4 items-start">
          <label className="cursor-pointer flex flex-col items-center justify-center w-32 h-48 rounded-xl border-2 border-dashed transition hover:opacity-80"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="cover" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <>
                <ImageIcon size={24} style={{ color: "var(--muted)" }} />
                <span className="text-xs mt-2 text-center" style={{ color: "var(--muted)" }}>
                  ដំឡើងរូបភាព
                </span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
          </label>
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            <p>· JPEG, PNG, WEBP</p>
            <p>· អត្រា 2:3 (cover book)</p>
            <p>· អតិបរិមា 5MB</p>
          </div>
        </div>
      </div>

      {/* PDF upload */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold" style={{ color: "var(--foreground)" }}>ឯកសារ PDF</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>ស្រេចចិត្ត — ប្រសិនបើមាន PDF និងអត្ថបទ អ្នកអានអាចប្ដូររវាង PDF ↔ អត្ថបទ</p>
          </div>
          <FileText size={20} style={{ color: "var(--muted)" }} />
        </div>
        <label className="cursor-pointer flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed transition hover:opacity-80"
          style={{ borderColor: pdfFile ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
          <Upload size={22} style={{ color: pdfFile ? "var(--accent)" : "var(--muted)" }} />
          <span className="text-sm mt-2 font-medium" style={{ color: pdfFile ? "var(--accent)" : "var(--muted)" }}>
            {pdfFile ? pdfFile.name : "ជ្រើសរើសឯកសារ PDF"}
          </span>
          <span className="text-xs mt-1" style={{ color: "var(--muted)" }}>អតិបរិមា 50MB</span>
          <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} className="hidden" />
        </label>
        {typeof book?.pdf_url === "string" && book.pdf_url && !pdfFile && (
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            PDF បច្ចុប្បន្ន:{" "}
            <a href={book.pdf_url} className="underline" target="_blank" rel="noreferrer">
              មើល PDF
            </a>
          </p>
        )}
      </div>

      {/* Audio narration upload + preview studio */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold" style={{ color: "var(--foreground)" }}>Voice Narration Studio</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Upload MP3 · Preview & trim · Set sync offset · Then save
            </p>
          </div>
          <Mic size={20} style={{ color: "var(--muted)" }} />
        </div>

        {/* Upload zone */}
        <label
          className="cursor-pointer flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed transition hover:opacity-80"
          style={{ borderColor: audioFile ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}
        >
          <Upload size={20} style={{ color: audioFile ? "var(--accent)" : "var(--muted)" }} />
          <span className="text-sm mt-1.5 font-medium" style={{ color: audioFile ? "var(--accent)" : "var(--muted)" }}>
            {audioFile ? audioFile.name : "ជ្រើស MP3 / M4A / WAV"}
          </span>
          <span className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Max 200MB</span>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setAudioFile(file);
              if (file) setAudioPreviewUrl(URL.createObjectURL(file));
            }}
            className="hidden"
          />
        </label>

        <div className="mt-4">
          <label style={labelStyle}>SRT / VTT timing file</label>
          <label
            className="cursor-pointer flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition hover:opacity-80"
            style={{ borderColor: srtFile ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold" style={{ color: srtFile ? "var(--accent)" : "var(--foreground)" }}>
                {srtFileName || "Upload matching .srt / .vtt"}
              </span>
              <span className="block text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                Used for exact voice highlighting in the reader
              </span>
            </span>
            <Upload size={18} style={{ color: srtFile ? "var(--accent)" : "var(--muted)" }} />
            <input
              type="file"
              accept=".srt,.vtt,text/plain,text/vtt,application/x-subrip"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setSrtFile(file);
                setSrtFileName(file?.name ?? "");
              }}
              className="hidden"
            />
          </label>
        </div>

        {/* Preview studio — shows when audio is available */}
        {audioPreviewUrl && (
          <div className="admin-audio-preview">
            <audio
              ref={previewRef}
              src={audioPreviewUrl}
              preload="metadata"
              onTimeUpdate={() => { const a = previewRef.current; if (a) setPreviewTime(a.currentTime); }}
              onLoadedMetadata={() => { const a = previewRef.current; if (a) setPreviewDuration(a.duration); }}
              onEnded={() => setPreviewPlaying(false)}
              onPause={() => setPreviewPlaying(false)}
              onPlay={() => setPreviewPlaying(true)}
            />

            {/* Time display */}
            <div className="admin-audio-time">{fmtTime(previewTime)}</div>
            <p className="text-center text-xs mb-3" style={{ color: "var(--muted)" }}>
              / {fmtTime(previewDuration)}
            </p>

            {/* Progress scrubber */}
            <input
              type="range"
              className="glass-player-progress"
              min={0} max={100} step={0.1}
              value={previewProgress}
              style={{ "--pct": `${previewProgress}%` } as React.CSSProperties}
              onChange={seekPreview}
            />

            {/* Play button */}
            <div className="flex justify-center mt-4 mb-4">
              <button type="button" className="glass-play-btn" onClick={togglePreview}>
                {previewPlaying ? <Pause size={22} /> : <Play size={22} />}
              </button>
            </div>

            {/* Trim controls */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label style={labelStyle}>Start trim (s)</label>
                <div className="flex gap-2">
                  <input
                    type="number" min={0} step={0.1}
                    value={audioStart}
                    onChange={(e) => setAudioStart(Number(e.target.value))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    className="admin-audio-mark-btn"
                    onClick={() => { const a = previewRef.current; if (a) setAudioStart(Math.round(a.currentTime * 10) / 10); }}
                  >
                    ▸ Mark
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>End trim (s) · 0 = full</label>
                <div className="flex gap-2">
                  <input
                    type="number" min={0} step={0.1}
                    value={audioEnd}
                    onChange={(e) => setAudioEnd(Number(e.target.value))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    className="admin-audio-mark-btn"
                    onClick={() => { const a = previewRef.current; if (a) setAudioEnd(Math.round(a.currentTime * 10) / 10); }}
                  >
                    ▸ Mark
                  </button>
                </div>
              </div>
            </div>

            {/* Sync offset */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label style={labelStyle}>Text sync offset (s) — increase if text lags behind voice</label>
                <input
                  type="number" min={-30} max={120} step={0.5}
                  value={audioOffset}
                  onChange={(e) => setAudioOffset(Number(e.target.value))}
                  style={{ ...inputStyle, width: "8rem" }}
                />
              </div>
              {!!book?.id && (
                <a
                  href={`/read/${book.id as string}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold mt-4 px-3 py-2 rounded-xl"
                  style={{ background: "var(--accent-light)", color: "var(--accent)", whiteSpace: "nowrap" }}
                >
                  <ExternalLink size={13} /> Open Reader
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rich text / markdown editor */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="px-6 pt-5 pb-3" style={{ background: "var(--bg-card)" }}>
          <h2 className="font-bold" style={{ color: "var(--foreground)" }}>មាតិកា · Content Editor</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            ស្រេចចិត្ត — អត្ថបទ ឬ Markdown · Drag &amp; drop images · Preview before saving
          </p>
        </div>
        <RichEditor
          name="content"
          value={typeof book?.content === "string" ? book.content : ""}
          onChange={setEditorContent}
        />
      </div>

      {/* Save button */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={openSaveDialog}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {loading ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 rounded-xl font-semibold text-sm border transition hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          បោះបង់
        </button>
      </div>
      </form>
    </>
  );
}
