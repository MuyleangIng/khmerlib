export type BookCategory =
  | "all"
  | "collection"
  | "literature"
  | "technology"
  | "general"
  | "geography-history"
  | "philosophy-psychology"
  | "religion"
  | "language"
  | "arts-entertainment"
  | "science"
  | "social-science"
  | "digital-literacy";

export const CATEGORIES: { value: BookCategory; label: string; labelKh: string }[] = [
  { value: "all", label: "All", labelKh: "ទាំងអស់" },
  { value: "collection", label: "Collection", labelKh: "បណ្តុំសៀវភៅ" },
  { value: "literature", label: "Literature", labelKh: "អក្សរសិល្ប៍" },
  { value: "technology", label: "Technology", labelKh: "បច្ចេកវិទ្យា" },
  { value: "general", label: "General Works", labelKh: "ស្នាដៃទូទៅ" },
  { value: "geography-history", label: "Geography & History", labelKh: "ភូមិវិទ្យា និង​ប្រវត្តិវិទ្យា" },
  { value: "philosophy-psychology", label: "Philosophy & Psychology", labelKh: "ទស្សនវិជ្ជា និង​ចិត្ត​វិទ្យា" },
  { value: "religion", label: "Religion", labelKh: "សាសនា" },
  { value: "language", label: "Language", labelKh: "ភាសា" },
  { value: "arts-entertainment", label: "Arts & Entertainment", labelKh: "សិល្បៈ និងការកំសាន្ដបែបអប់រំ" },
  { value: "science", label: "Science", labelKh: "វិទ្យាសាស្ត្រពិត" },
  { value: "social-science", label: "Social Science", labelKh: "វិទ្យាសាស្រ្តសង្គម" },
  { value: "digital-literacy", label: "Digital Literacy", labelKh: "អក្ខរកម្មឌីជីថល" },
];

export type ContentType = "pdf" | "markdown";

export interface Book {
  id: string;
  title: string;
  title_kh?: string;
  author?: string;
  publisher?: string;
  published_year?: number;
  language: string;
  category: BookCategory;
  tags: string; // JSON array string
  description?: string;
  cover_url?: string;
  pdf_url?: string;
  audio_url?: string;
  audio_start?: number;
  audio_end?: number;
  audio_offset?: number;
  srt_content?: string;
  srt_file_name?: string;
  content?: string;
  content_type: ContentType;
  view_count: number;
  like_count: number;
  is_published: number;
  created_at: string;
  updated_at: string;
}

export interface ReadingSettings {
  fontSize: number;
  theme: "default" | "sepia" | "dark" | "green";
  fontFamily: string; // Khmer font ID from KHMER_FONTS
}

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontSize: 18,
  theme: "default",
  fontFamily: "kantumruy-pro",
};

export const READING_THEMES = {
  default: { bg: "#ffffff", text: "#1a1a1a", label: "Default" },
  sepia: { bg: "#f5e6c8", text: "#5c4a1e", label: "Sepia" },
  dark: { bg: "#1a1a1a", text: "#e5e5e5", label: "Dark" },
  green: { bg: "#d4edda", text: "#1a3a1a", label: "Green" },
};
