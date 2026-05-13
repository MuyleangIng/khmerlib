"use client";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminDeleteButton({ bookId }: { bookId: string }) {
  const handleDelete = async () => {
    if (!confirm("លុបសៀវភៅនេះ?")) return;
    const toastId = toast.loading("កំពុងលុប...");
    try {
      const res = await fetch(`/api/admin/books/${bookId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("🗑️ លុបបានជោគជ័យ!", { id: toastId });
        setTimeout(() => { window.location.reload(); }, 600);
      } else {
        toast.error("❌ មានបញ្ហា ព្យាយាមម្តងទៀត", { id: toastId });
      }
    } catch {
      toast.error("❌ មានបញ្ហា ព្យាយាមម្តងទៀត", { id: toastId });
    }
  };

  return (
    <button onClick={handleDelete} className="p-1.5 rounded hover:bg-red-50">
      <Trash2 size={14} color="#ef4444" />
    </button>
  );
}
