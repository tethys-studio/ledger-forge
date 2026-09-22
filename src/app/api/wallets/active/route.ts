import { NextResponse } from 'next/server';
import { getActiveWallets } from '@/lib/fintech-engine';
import { query } from '@/lib/db';
import { Category } from '@/lib/types';
import { getServerSession } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const [wallets, categories] = await Promise.all([
      getActiveWallets(userId),
      query<Category>(
        `SELECT DISTINCT ON (LOWER(name)) id, name, icon, color FROM categories 
         WHERE user_id = $1 OR is_system = TRUE 
         ORDER BY LOWER(name) ASC, user_id NULLS LAST`,
        [userId]
      ),
    ]);

    return NextResponse.json(
      { wallets, categories },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching active wallets & categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active wallets' },
      { status: 500 }
    );
  }
}
