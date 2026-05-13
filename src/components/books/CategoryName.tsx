"use client";

import { CATEGORIES } from "@/lib/types";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function CategoryName({ value }: { value: string }) {
  const { locale } = useI18n();
  const category = CATEGORIES.find((item) => item.value === value);

  if (!category) return null;
  return <>{locale === "km" ? category.labelKh : category.label}</>;
}
