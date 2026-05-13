// Cloudflare D1 via REST API for Next.js
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
const CF_D1_DATABASE_ID = process.env.CF_D1_DATABASE_ID!;
const CF_API_TOKEN = process.env.CF_API_TOKEN!;

const D1_API_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}/query`;

export interface QueryResult<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  error?: string;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<QueryResult<T>> {
  const res = await fetch(D1_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
    cache: "no-store",
  });

  const data = await res.json();
  if (!data.success) {
    console.error("D1 query error:", data.errors);
    return { results: [], success: false, error: data.errors?.[0]?.message };
  }
  return { results: data.result?.[0]?.results ?? [], success: true };
}

export async function queryFirst<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<T | null> {
  const { results } = await query<T>(sql, params);
  return results[0] ?? null;
}
