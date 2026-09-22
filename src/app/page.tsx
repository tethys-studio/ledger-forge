import {
  getCashFlowSummary,
  getSinkingFunds,
  getBurnVelocityTimeline,
  getCategoryBreakdown,
  getActiveDebts,
  getRecentTransactions,
  getWalletsWithBalance,
  formatINR,
} from '@/lib/fintech-engine';
import { query } from '@/lib/db';
import { Category } from '@/lib/types';
import { getServerSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import HeroMetrics from '@/components/dashboard/HeroMetrics';
import BurnVelocityChart from '@/components/dashboard/BurnVelocityChart';
import CategoryImpulseDonut from '@/components/dashboard/CategoryImpulseDonut';
import SinkingFundTimeline from '@/components/dashboard/SinkingFundTimeline';
import UdhaarWatchlist from '@/components/dashboard/UdhaarWatchlist';
import InitialSetupCard from '@/components/dashboard/InitialSetupCard';
import Link from 'next/link';
import {
  ReceiptText,
  Flame,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Plus,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }
  const userId = session.user.id;

  const [
    summary,
    sinkingFunds,
    velocityTimeline,
    categoryBreakdown,
    activeDebts,
    recentTx,
    wallets,
    taxonomicalCategories,
  ] = await Promise.all([
    getCashFlowSummary(userId),
    getSinkingFunds(userId),
    getBurnVelocityTimeline(userId),
    getCategoryBreakdown(userId),
    getActiveDebts(userId),
    getRecentTransactions(userId, 6),
    getWalletsWithBalance(userId),
    query<Category>(
      `SELECT DISTINCT ON (LOWER(name)) * FROM categories 
       WHERE user_id = $1 OR is_system = TRUE 
       ORDER BY LOWER(name) ASC, user_id NULLS LAST`,
      [userId]
    ),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* 1. Header Banner & Quick Wallet Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Executive Cash Flow Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Realized cash positions, dynamic pacing velocity, and sinking fund runway
          </p>
        </div>

        {/* Liquid Wallets Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {wallets.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-3.5 py-1.5 text-xs text-slate-400">
              <span>No wallets created yet</span>
            </div>
          ) : (
            wallets.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0F172A] px-3 py-1.5 text-xs shadow-sm"
              >
                <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-slate-300 font-medium">{w.name}:</span>
                <span className="font-bold tabular-num text-white">
                  {formatINR(w.current_balance || 0)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. First-Time Setup / Guided Onboarding Trigger */}
      <InitialSetupCard
        walletCount={wallets.length}
        hasBudget={summary.monthToDateBudget > 0}
        categories={taxonomicalCategories}
      />

      {/* 3. Hero Metric Strip */}
      <HeroMetrics summary={summary} />

      {/* 4. Visual Charts Row (2 Cols Velocity Chart, 1 Col Impulse Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BurnVelocityChart
            data={velocityTimeline}
            monthlyBudget={summary.monthToDateBudget}
          />
        </div>
        <div className="lg:col-span-1">
          <CategoryImpulseDonut
            categories={categoryBreakdown}
            impulseDrainRate={summary.impulseDrainRate}
            impulseTotalAmount={summary.impulseTotalAmount}
            impulseStatus={summary.impulseStatus}
          />
        </div>
      </div>

      {/* 5. Operational Row (Sinking Funds Timeline & Active Debts Watchlist) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SinkingFundTimeline sinkingFunds={sinkingFunds} />
        <UdhaarWatchlist
          debts={activeDebts}
          wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
        />
      </div>

      {/* 6. Recent Transactions Feed */}
      <div className="ledger-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Recent Master Ledger Entries
              </h3>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                Immutable Ledger
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Latest operational inflows, outflows, and loan balance transformations
            </p>
          </div>

          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium group"
          >
            <span>Full Ledger</span>
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        {recentTx.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
            <ReceiptText className="mx-auto h-8 w-8 text-slate-600" />
            <h4 className="mt-2 text-xs font-bold text-white">No Transactions Recorded Yet</h4>
            <p className="mt-1 text-[11px] text-slate-500 max-w-sm mx-auto">
              Your master ledger is blank. Press &apos;Q&apos; or use Quick Log to register your first expenditure or loan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/5 text-[11px] font-medium uppercase text-slate-500 font-mono">
                <tr>
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Account</th>
                  <th className="pb-3">Intent / Type</th>
                  <th className="pb-3 pr-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentTx.map((tx) => {
                  const isPositive = tx.type === 'INCOME' || tx.type === 'DEBT_REPAYMENT';
                  const isImpulse = tx.intent === 'IMPULSE';
                  const isLent = tx.type === 'LENT';

                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pl-2 font-mono text-slate-400 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-white">
                          {tx.notes || tx.category_name || 'Transaction'}
                        </div>
                        {tx.category_name && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: tx.category_color || '#8B5CF6' }}
                            />
                            <span>{tx.category_name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-slate-300 whitespace-nowrap">
                        {tx.wallet_name || 'Primary Bank'}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        {isImpulse ? (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400 border border-rose-500/20">
                            <Flame className="h-3 w-3" />
                            Impulse
                          </span>
                        ) : isLent ? (
                          <span className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-500/20">
                            Udhaar Lent
                          </span>
                        ) : tx.type === 'DEBT_REPAYMENT' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/20">
                            Debt Returned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                            {tx.intent || tx.type}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-2 text-right whitespace-nowrap font-extrabold tabular-num">
                        <span className={isPositive ? 'text-emerald-400' : 'text-white'}>
                          {isPositive ? '+' : '-'}{formatINR(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
