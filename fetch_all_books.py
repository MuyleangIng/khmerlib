import argparse
import json
import time
from pathlib import Path

import requests


API_URL = "https://api.saladigital.org/api/private"
DEFAULT_CATEGORY_ID = "64dc8a4f97e50596429fd062"
DEFAULT_LIMIT = 25
DEFAULT_PAGE = 1

QUERY = """
query getAllBooks($limit: Int, $offset: Int, $cate: String, $sort: String, $search: String) {
  books(limit: $limit, offset: $offset, cate: $cate, sort: $sort, search: $search) {
    total
    books {
      id
      title
      views
      downloads
      thumbnail
      createdAt
      file
      orgId
      slug
      ownerId
      updatedAt
      isUserRated
      language
      rate
      isDownloadable
      preparedBy
      author
      publisher
      yearOfPublication
      pages
      fileSize
      likes
      subcategories {
        title {
          kh
          en
          __typename
        }
        __typename
      }
      category {
        id
        title {
          kh
          en
          __typename
        }
        __typename
      }
      organization {
        id
        name
        isVerify
        logo
        isSubscribed
        totalSubscribers
        slug
        __typename
      }
      owner {
        userId
        fullname
        avatar
        username
        __typename
      }
      tags {
        id
        title
        __typename
      }
      __typename
    }
    __typename
  }
}
""".strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch all books from the Sala Digital GraphQL API with pagination."
    )
    parser.add_argument("output_positional", nargs="?", help="Optional output JSON file path")
    parser.add_argument("--cate", default=DEFAULT_CATEGORY_ID, help="Category ID")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help="Page size")
    parser.add_argument(
        "--offset",
        type=int,
        default=DEFAULT_PAGE,
        help="Starting page number. This API uses page numbering, not row skip. First page is 1.",
    )
    parser.add_argument("--sort", default=None, help="Optional sort value")
    parser.add_argument("--search", default=None, help="Optional search text")
    parser.add_argument("--delay", type=float, default=0.3, help="Delay between requests in seconds")
    parser.add_argument("--output", default=None, help="Output JSON file")
    return parser.parse_args()


def make_payload(args: argparse.Namespace, offset: int) -> dict:
    return {
        "operationName": "getAllBooks",
        "variables": {
            "limit": args.limit,
            "offset": offset,
            "cate": args.cate,
            "sort": args.sort,
            "search": args.search,
        },
        "extensions": {
            "clientLibrary": {
                "name": "@apollo/client",
                "version": "4.1.4",
            }
        },
        "query": QUERY,
    }


def fetch_page(session: requests.Session, payload: dict) -> dict:
    response = session.post(API_URL, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()

    if data.get("errors"):
        raise RuntimeError(json.dumps(data["errors"], ensure_ascii=False, indent=2))

    return data


def fetch_all_books(args: argparse.Namespace) -> dict:
    session = requests.Session()
    session.headers.update(
        {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
        }
    )

    all_books = []
    seen_ids = set()
    page = max(args.offset, 1)
    total = None

    while True:
        payload = make_payload(args, page)
        result = fetch_page(session, payload)
        books_data = result["data"]["books"]
        page_books = books_data["books"]

        if total is None:
            total = books_data["total"]
            print(f"Total books: {total}")

        if not page_books:
            break

        new_count = 0
        for book in page_books:
            book_id = book.get("id")
            if book_id and book_id in seen_ids:
                continue
            if book_id:
                seen_ids.add(book_id)
            all_books.append(book)
            new_count += 1

        print(
            f"Fetched {len(all_books)}/{total} books "
            f"(page={page}, page_size={len(page_books)}, added={new_count})"
        )

        page += 1

        if total is not None and len(all_books) >= total:
            break

        time.sleep(args.delay)

    return {
        "data": {
            "books": {
                "total": total or 0,
                "books": all_books,
            }
        }
    }


def main() -> None:
    args = parse_args()
    output_value = args.output_positional or args.output or "data.json"
    output_path = Path(output_value)
    data = fetch_all_books(args)
    output_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Saved to {output_path.resolve()}")


if __name__ == "__main__":
    main()
