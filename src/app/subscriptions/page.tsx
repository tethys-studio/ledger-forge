import { query } from '@/lib/db';
import { SubscriptionRecurring, AccountWallet, Category } from '@/lib/types';
import { getSinkingFunds } from '@/lib/fintech-engine';
import { getServerSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import SinkingFundsClient from '@/components/subscriptions/SinkingFundsClient';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }
  const userId = session.user.id;

  const [sinkingFunds, wallets, categories] = await Promise.all([
    getSinkingFunds(userId),
    query<AccountWallet>(
      `SELECT * FROM accounts_or_wallets WHERE user_id = $1 AND is_liquid = TRUE AND (status = 'ACTIVE' OR status IS NULL) ORDER BY name ASC`,
      [userId]
    ),
    query<Category>(
      `SELECT DISTINCT ON (LOWER(name)) * FROM categories 
       WHERE user_id = $1 OR is_system = TRUE 
       ORDER BY LOWER(name) ASC, user_id NULLS LAST`,
      [userId]
    ),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          Sinking Funds &amp; Zero-Cost Smart Alerts
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Amortized daily reserve accounting for 84-day and multi-month bills with Telegram and native phone calendar alarms
        </p>
      </div>

      <SinkingFundsClient
        sinkingFunds={sinkingFunds}
        wallets={wallets}
        categories={categories}
        userId={userId}
      />
    </div>
  );
}
