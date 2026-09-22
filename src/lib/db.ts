import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let sqlInstance: NeonQueryFunction<false, false> | null = null;

/**
 * Lazy, server-only Neon SQL connection instance.
 */
export function getSql(): NeonQueryFunction<false, false> {
  if (!sqlInstance) {
    const conn = process.env.DATABASE_URL;
    if (!conn) {
      throw new Error(
        'DATABASE_URL is not defined in environment variables. Please check .env.local.'
      );
    }
    sqlInstance = neon(conn);
  }
  return sqlInstance;
}

/**
 * Execute parameterized query safely with explicit typing.
 */
export async function query<T = Record<string, unknown>>(
  queryText: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const sql = getSql();
    const result = await sql.query(queryText, params);
    return result as unknown as T[];
  } catch (error) {
    console.error('Database query error:', error, '\nQuery:', queryText, '\nParams:', params);
    throw error;
  }
}

/**
 * Execute single row query or null.
 */
export async function queryOne<T = Record<string, unknown>>(
  queryText: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(queryText, params);
  return rows.length > 0 ? rows[0] : null;
}
