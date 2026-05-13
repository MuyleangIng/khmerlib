export interface KhmerFont {
  id: string;
  name: string;
  nameKh: string;
  google: string; // Google Fonts family name
  weights: string;
  preview: string;
}

export const KHMER_FONTS: KhmerFont[] = [
  {
    id: "hanuman",
    name: "Hanuman",
    nameKh: "ហានូម៉ាន់",
    google: "Hanuman",
    weights: "100;300;400;700;900",
    preview: "ខ្ញុំចូលចិត្តអានសៀវភៅ",
  },
  {
    id: "kantumruy-pro",
    name: "Kantumruy Pro",
    nameKh: "កន្ទុំរូយ ប្រូ",
    google: "Kantumruy+Pro",
    weights: "100;200;300;400;500;600;700",
    preview: "ខ្ញុំចូលចិត្តអានសៀវភៅ",
  },
  {
    id: "battambang",
    name: "Battambang",
    nameKh: "បាត់ដំបង",
    google: "Battambang",
    weights: "100;300;400;700;900",
    preview: "ខ្ញុំចូលចិត្តអានសៀវភៅ",
  },
  {
    id: "bayon",
    name: "Bayon",
    nameKh: "បាយ័ន",
    google: "Bayon",
    weights: "400",
    preview: "ខ្ញុំចូលចិត្តអានសៀវភៅ",
  },
  {
    id: "moul",
    name: "Moul",
    nameKh: "មូល",
    google: "Moul",
    weights: "400",
    preview: "ខ្ញុំចូលចិត្តអានសៀវភៅ",
  },
  {
    id: "siemreap",
    name: "Siemreap",
    nameKh: "សៀមរាប",
    google: "Siemreap",
    weights: "400",
    preview: "ខ្ញុំចូលចិត្តអានសៀវភៅ",
  },
  {
    id: "koulen",
    name: "Koulen",
    nameKh: "គូលែន",
    google: "Koulen",
    weights: "400",
    preview: "ខ្ញុំចូលចិត្តអានសៀវភៅ",
  },
  {
    id: "dangrek",
    name: "Dangrek",
    nameKh: "ដងរែក",
    google: "Dangrek",
    weights: "400",
    preview: "ខ្ញុំចូលចិត្តអានសៀវភៅ",
  },
  {
    id: "nokora",
    name: "Nokora",
    nameKh: "នគរា",
    google: "Nokora",
    weights: "100;400;700;900",
    preview: "ខ្ញុំចូលចិត្តអានសៀវភៅ",
  },
  {
    id: "khmer",
    name: "Khmer",
    nameKh: "ខ្មែរ",
    google: "Khmer",
    weights: "400",
    preview: "ខ្ញុំចូលចិត្តអានសៀវភៅ",
  },
];

export const DEFAULT_FONT_ID = "kantumruy-pro";

export function getFontById(id: string): KhmerFont {
  return KHMER_FONTS.find((f) => f.id === id) ?? KHMER_FONTS[0];
}

export function buildGoogleFontUrl(fonts: KhmerFont[]): string {
  const families = fonts
    .map((f) => `family=${f.google}:wght@${f.weights}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
