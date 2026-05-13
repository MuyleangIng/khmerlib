import BookForm from "@/components/admin/BookForm";

export default function NewBookPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--foreground)" }}>
        បន្ថែមសៀវភៅថ្មី
      </h1>
      <BookForm />
    </div>
  );
}
