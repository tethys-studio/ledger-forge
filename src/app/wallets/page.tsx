import { getWalletsWithBalance } from '@/lib/fintech-engine';
import WalletsManagementClient from '@/components/wallets/WalletsManagementClient';
import { getServerSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WalletsPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }
  const wallets = await getWalletsWithBalance(session.user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          Accounts &amp; Wallets Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Real-time double-entry liquidity management, account lifecycle controls, and balance sweeping
        </p>
      </div>

      <WalletsManagementClient initialWallets={wallets} />
    </div>
  );
}
