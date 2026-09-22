import { query } from '@/lib/db';
import { DebtLent, AccountWallet } from '@/lib/types';
import { getActiveDebts } from '@/lib/fintech-engine';
import { getServerSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import DebtsManagementClient from '@/components/debts/DebtsManagementClient';

export const dynamic = 'force-dynamic';

export default async function DebtsPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }
  const userId = session.user.id;

  const [debts, wallets] = await Promise.all([
    getActiveDebts(userId),
    query<AccountWallet>(
      `SELECT * FROM accounts_or_wallets WHERE user_id = $1 AND is_liquid = TRUE AND (status = 'ACTIVE' OR status IS NULL) ORDER BY name ASC`,
      [userId]
    ),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          Debts &amp; Counterparty Receivables (Udhaar)
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          State-machine tracking of money lent to friends and relatives with asset restoration upon repayment
        </p>
      </div>

      <DebtsManagementClient debts={debts} wallets={wallets} />
    </div>
  );
}
