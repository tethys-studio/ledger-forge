'use client';

import { CashFlowSummary } from '@/lib/types';
import { formatINR } from '@/lib/formatters';
import {
  Wallet,
  Gauge,
  HandCoins,
  TrendingUp,
  AlertTriangle,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface HeroMetricsProps {
  summary: CashFlowSummary;
}

export default function HeroMetrics({ summary }: HeroMetricsProps) {
  // Pacing status calculations
  const pacingPercentage = Math.round(summary.burnVelocityRatio * 100);

  const getPacingColor = () => {
    if (summary.burnStatus === 'SAFE') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (summary.burnStatus === 'WARN') return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getPacingBarColor = () => {
    if (summary.burnStatus === 'SAFE') return 'bg-emerald-500';
    if (summary.burnStatus === 'WARN') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* 1. Liquid Balance Card */}
      <div className="ledger-card p-5 relative overflow-hidden group hover:border-violet-500/40">
        <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-violet-600/10 blur-2xl group-hover:bg-violet-600/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Spendable Liquid Cash
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Wallet className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-num tracking-tight">
            {formatINR(summary.liquidBalance)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Authoritative settled fiat</span>
          </div>
        </div>
      </div>

      {/* 2. MTD Burn vs Dynamic Prorated Budget Card */}
      <div className="ledger-card p-5 relative overflow-hidden group hover:border-amber-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            MTD Burn Pacing
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Gauge className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-num">
              {formatINR(summary.monthToDateExpense)}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {summary.monthToDateBudget > 0 ? `/ ${formatINR(summary.monthToDateBudget)}` : '/ Uncapped'}
            </span>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getPacingBarColor()}`}
              style={{
                width: `${summary.monthToDateBudget > 0 ? Math.min(pacingPercentage, 100) : 0}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-mono ${getPacingColor()}`}>
              {summary.monthToDateBudget === 0 ? (
                'No budget set'
              ) : (
                <>
                  {summary.burnStatus === 'SAFE' && <CheckCircle2 className="h-3 w-3" />}
                  {summary.burnStatus === 'WARN' && <AlertTriangle className="h-3 w-3" />}
                  {summary.burnStatus === 'DANGER' && <Flame className="h-3 w-3" />}
                  {pacingPercentage}% velocity
                </>
              )}
            </span>
            <span className="text-slate-400 text-[11px]">
              {summary.monthToDateBudget > 0 ? `Target: ${formatINR(summary.proratedBudget)}` : 'Set monthly cap'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Active Udhaar (Receivables) */}
      <div className="ledger-card p-5 relative overflow-hidden group hover:border-cyan-500/40">
        <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-cyan-600/10 blur-2xl group-hover:bg-cyan-600/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Active Lent Money (Udhaar)
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <HandCoins className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300 tabular-num tracking-tight">
            {formatINR(summary.activeLentOutstanding)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{summary.activeDebtsCount} pending debtor{summary.activeDebtsCount === 1 ? '' : 's'}</span>
            <span className="text-cyan-400/80 font-mono text-[11px]">Receivable Asset</span>
          </div>
        </div>
      </div>

      {/* 4. Expected Inflow Pipeline */}
      <div className="ledger-card p-5 relative overflow-hidden group hover:border-blue-500/40">
        <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-blue-600/10 blur-2xl group-hover:bg-blue-600/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Inflow Pipeline
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-300 tabular-num tracking-tight">
            {formatINR(summary.unreceivedPipeline)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{summary.pendingInvoicesCount} expected invoice{summary.pendingInvoicesCount === 1 ? '' : 's'}</span>
            <span className="text-blue-400 font-medium text-[11px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
              Unreceived
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
