import { query } from '@/lib/db';
import { Transaction, Category, AccountWallet } from '@/lib/types';
import { getServerSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import TransactionLedgerClient from '@/components/transactions/TransactionLedgerClient';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }
  const userId = session.user.id;

  const [transactions, categories, wallets] = await Promise.all([
    query<Transaction & { wallet_name: string; transfer_wallet_name?: string; category_name: string; category_color: string; counterparty_name: string }>(
      `SELECT 
         t.*,
         w.name AS wallet_name,
         tw.name AS transfer_wallet_name,
         c.name AS category_name,
         c.color AS category_color,
         d.counterparty_name
       FROM transactions t
       LEFT JOIN accounts_or_wallets w ON w.id = t.wallet_id
       LEFT JOIN accounts_or_wallets tw ON tw.id = t.transfer_wallet_id
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN debts_lent d ON d.id = t.debt_id
       WHERE t.user_id = $1
       ORDER BY t.date DESC, t.created_at DESC`,
      [userId]
    ),
    query<Category>(
      `SELECT DISTINCT ON (LOWER(name)) * FROM categories 
       WHERE user_id = $1 OR is_system = TRUE 
       ORDER BY LOWER(name) ASC, user_id NULLS LAST`,
      [userId]
    ),
    query<AccountWallet>(
      `SELECT * FROM accounts_or_wallets WHERE user_id = $1 ORDER BY name ASC`,
      [userId]
    ),
  ]);

  const formattedTransactions: Transaction[] = transactions.map((t) => ({
    ...t,
    amount: parseFloat(t.amount as unknown as string),
    date: t.date ? ((t.date as unknown) instanceof Date ? (t.date as unknown as Date).toISOString().split('T')[0] : String(t.date).split('T')[0]) : '',
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          Master Transaction Ledger
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Chronological record of all operational inflows, outflows, and asset transformations
        </p>
      </div>

      <TransactionLedgerClient
        initialTransactions={formattedTransactions}
        categories={categories}
        wallets={wallets}
      />
    </div>
  );
}
