import { Book } from "@/lib/types";
import BookCard from "./BookCard";

export default function BookGrid({ books }: { books: Book[] }) {
  return (
    <div className="book-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
}
