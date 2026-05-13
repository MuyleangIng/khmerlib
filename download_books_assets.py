import argparse
import json
import re
import unicodedata
from pathlib import Path
from urllib.parse import urlparse

import requests
from tqdm import tqdm


DEFAULT_INPUT = "data.json"
DEFAULT_OUTPUT = "all book"
CHUNK_SIZE = 1024 * 256


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download thumbnails and PDFs from data.json into one folder per book."
    )
    parser.add_argument("input", nargs="?", default=DEFAULT_INPUT, help="Input JSON file")
    parser.add_argument("output", nargs="?", default=DEFAULT_OUTPUT, help="Output folder")
    parser.add_argument("--force", action="store_true", help="Redownload files even if they already exist")
    parser.add_argument("--timeout", type=int, default=120, help="Request timeout in seconds")
    return parser.parse_args()


def sanitize_name(value: str, fallback: str = "untitled") -> str:
    text = unicodedata.normalize("NFC", (value or fallback).strip())
    text = re.sub(r'[\\/:*?"<>|]+', " ", text)
    text = re.sub(r"\s+", " ", text).strip().rstrip(". ")
    return text or fallback


def make_unique_folder(base_name: str, used_names: set[str]) -> str:
    candidate = base_name
    counter = 2
    while candidate in used_names:
        candidate = f"{base_name} {counter}"
        counter += 1
    used_names.add(candidate)
    return candidate


def file_extension_from_url(url: str, fallback: str) -> str:
    try:
        suffix = Path(urlparse(url).path).suffix
        return suffix if suffix else fallback
    except Exception:
        return fallback


def short_label(text: str, limit: int = 36) -> str:
    text = text.strip() or "file"
    if len(text) <= limit:
        return text
    return f"{text[:limit - 3]}..."


def download_file(
    session: requests.Session,
    url: str,
    destination: Path,
    timeout: int,
    force: bool,
    desc: str,
) -> tuple[str, int]:
    if not url:
        return "missing", 0

    if destination.exists() and not force:
        return "skipped", destination.stat().st_size

    destination.parent.mkdir(parents=True, exist_ok=True)
    temp_path = destination.with_name(f"{destination.name}.part")

    with session.get(url, stream=True, timeout=timeout) as response:
        response.raise_for_status()
        total = int(response.headers.get("content-length", 0) or 0)

        with temp_path.open("wb") as handle, tqdm(
            total=total if total > 0 else None,
            unit="B",
            unit_scale=True,
            unit_divisor=1024,
            desc=short_label(desc),
            leave=False,
        ) as progress:
            for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                if not chunk:
                    continue
                handle.write(chunk)
                progress.update(len(chunk))

    temp_path.replace(destination)
    return "downloaded", destination.stat().st_size


def build_metadata(book: dict, folder_name: str, thumbnail_name: str | None, pdf_name: str | None) -> dict:
    category = book.get("category") or {}
    category_title = category.get("title") or {}
    organization = book.get("organization") or {}
    owner = book.get("owner") or {}

    return {
        "id": book.get("id"),
        "title": book.get("title"),
        "slug": book.get("slug"),
        "author": book.get("author"),
        "preparedBy": book.get("preparedBy"),
        "publisher": book.get("publisher"),
        "yearOfPublication": book.get("yearOfPublication"),
        "language": book.get("language"),
        "views": book.get("views"),
        "downloads": book.get("downloads"),
        "pages": book.get("pages"),
        "fileSize": book.get("fileSize"),
        "createdAt": book.get("createdAt"),
        "updatedAt": book.get("updatedAt"),
        "isDownloadable": book.get("isDownloadable"),
        "source": {
            "thumbnailUrl": book.get("thumbnail"),
            "pdfUrl": book.get("file"),
        },
        "files": {
            "folder": folder_name,
            "thumbnail": thumbnail_name,
            "pdf": pdf_name,
        },
        "category": {
            "id": category.get("id"),
            "title": {
                "kh": category_title.get("kh"),
                "en": category_title.get("en"),
            },
        },
        "subcategories": [
            {
                "kh": ((item.get("title") or {}).get("kh")),
                "en": ((item.get("title") or {}).get("en")),
            }
            for item in (book.get("subcategories") or [])
        ],
        "organization": {
            "id": organization.get("id"),
            "name": organization.get("name"),
            "slug": organization.get("slug"),
            "logo": organization.get("logo"),
            "isVerify": organization.get("isVerify"),
            "totalSubscribers": organization.get("totalSubscribers"),
        },
        "owner": {
            "userId": owner.get("userId"),
            "fullname": owner.get("fullname"),
            "username": owner.get("username"),
            "avatar": owner.get("avatar"),
        },
        "tags": [
            {
                "id": tag.get("id"),
                "title": tag.get("title"),
            }
            for tag in (book.get("tags") or [])
        ],
    }


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    payload = json.loads(input_path.read_text(encoding="utf-8"))
    books = payload["data"]["books"]["books"]

    output_path.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})

    used_names: set[str] = set()
    index: list[dict] = []
    stats = {"downloaded": 0, "skipped": 0, "missing": 0, "failed": 0}

    with tqdm(books, desc="Books", unit="book") as books_bar:
        for book in books_bar:
            title = book.get("title") or book.get("id") or "untitled"
            folder_name = make_unique_folder(sanitize_name(title, "untitled"), used_names)
            book_dir = output_path / folder_name
            book_dir.mkdir(parents=True, exist_ok=True)

            books_bar.set_postfix_str(short_label(title, 24))

            thumbnail_url = book.get("thumbnail") or ""
            pdf_url = book.get("file") or ""

            thumbnail_ext = file_extension_from_url(thumbnail_url, ".jpg")
            thumbnail_name = f"thumbnail{thumbnail_ext}"
            pdf_name = "book.pdf"

            thumbnail_path = book_dir / thumbnail_name
            pdf_path = book_dir / pdf_name

            thumbnail_saved_name: str | None = None
            pdf_saved_name: str | None = None

            for url, dest, label, kind in [
                (thumbnail_url, thumbnail_path, f"Thumb {title}", "thumbnail"),
                (pdf_url, pdf_path, f"PDF {title}", "pdf"),
            ]:
                try:
                    status, _size = download_file(
                        session=session,
                        url=url,
                        destination=dest,
                        timeout=args.timeout,
                        force=args.force,
                        desc=label,
                    )
                    stats[status] += 1
                    if status in {"downloaded", "skipped"}:
                        if kind == "thumbnail":
                            thumbnail_saved_name = dest.name
                        else:
                            pdf_saved_name = dest.name
                except Exception as exc:
                    stats["failed"] += 1
                    print(f"\n[{kind} failed] {title}: {exc}")

            metadata = build_metadata(book, folder_name, thumbnail_saved_name, pdf_saved_name)
            (book_dir / "metadata.json").write_text(
                json.dumps(metadata, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            index.append(
                {
                    "id": book.get("id"),
                    "title": book.get("title"),
                    "folder": folder_name,
                    "thumbnail": thumbnail_saved_name,
                    "pdf": pdf_saved_name,
                    "categoryKh": (((book.get("category") or {}).get("title") or {}).get("kh")),
                    "categoryEn": (((book.get("category") or {}).get("title") or {}).get("en")),
                    "organization": ((book.get("organization") or {}).get("name")),
                }
            )

    (output_path / "books-index.json").write_text(
        json.dumps(
            {
                "totalBooks": len(index),
                "books": index,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Done. Output folder: {output_path.resolve()}")
    print(
        "Stats:",
        json.dumps(stats, ensure_ascii=False, indent=2),
    )


if __name__ == "__main__":
    main()
