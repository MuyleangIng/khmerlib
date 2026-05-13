"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Heart } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function LikeButton({
  bookId,
  initialLikes,
}: {
  bookId: string;
  initialLikes: number;
}) {
  const { t } = useI18n();
  const { isSignedIn } = useUser();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!isSignedIn || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/like`, { method: "POST" });
      const data = await res.json();
      if (data.liked !== undefined) {
        setLiked(data.liked);
        setLikes(data.like_count);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition hover:opacity-80 disabled:opacity-50"
      style={
        liked
          ? { background: "#fee2e2", color: "#ef4444", borderColor: "#fecaca" }
          : { borderColor: "var(--border)", color: "var(--muted)" }
      }
    >
      <Heart size={15} fill={liked ? "#ef4444" : "none"} />
      {liked ? t("action.liked") : t("action.like")} · {likes}
    </button>
  );
}
