import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  // Test 1: simple read
  const read = await query("SELECT id, title FROM books LIMIT 3");

  // Test 2: simple write
  const write = await query(
    "UPDATE books SET updated_at = datetime('now') WHERE id = (SELECT id FROM books LIMIT 1)"
  );

  return NextResponse.json({
    token_prefix: process.env.CF_API_TOKEN?.slice(0, 8),
    account_id: process.env.CF_ACCOUNT_ID,
    db_id: process.env.CF_D1_DATABASE_ID,
    read_success: read.success,
    read_count: read.results.length,
    read_error: read.error,
    write_success: write.success,
    write_error: write.error,
  });
}
