import { query } from '@/lib/db';
import { IncomeSource, AccountWallet } from '@/lib/types';
import { getServerSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import IncomePipelineClient from '@/components/income/IncomePipelineClient';

export const dynamic = 'force-dynamic';

export default async function IncomePage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }
  const userId = session.user.id;

  const [incomeSources, wallets] = await Promise.all([
    query<IncomeSource & { wallet_name: string }>(
      `SELECT 
         i.*,
         w.name AS wallet_name
       FROM income_sources i
       LEFT JOIN accounts_or_wallets w ON w.id = i.wallet_id
       WHERE i.user_id = $1
       ORDER BY 
         CASE WHEN i.status = 'PENDING' THEN 1 ELSE 2 END,
         i.due_date ASC`,
      [userId]
    ),
    query<AccountWallet>(
      `SELECT * FROM accounts_or_wallets WHERE user_id = $1 AND is_liquid = TRUE AND (status = 'ACTIVE' OR status IS NULL) ORDER BY name ASC`,
      [userId]
    ),
  ]);

  const formattedSources: IncomeSource[] = incomeSources.map((s) => ({
    ...s,
    expected_amount: parseFloat(s.expected_amount as unknown as string),
    due_date: s.due_date ? ((s.due_date as unknown) instanceof Date ? (s.due_date as unknown as Date).toISOString().split('T')[0] : String(s.due_date).split('T')[0]) : '',
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          Income &amp; Inflow Pipeline
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Strict separation between anticipated contract receivables and realized liquid funds
        </p>
      </div>

      <IncomePipelineClient
        incomeSources={formattedSources}
        wallets={wallets}
      />
    </div>
  );
}
