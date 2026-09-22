'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SubscriptionRecurring } from '@/lib/types';
import { formatINR } from '@/lib/formatters';
import { renewSubscription } from '@/lib/actions';
import {
  Calendar,
  Clock,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Zap,
} from 'lucide-react';

interface SinkingFundTimelineProps {
  sinkingFunds: SubscriptionRecurring[];
}

export default function SinkingFundTimeline({ sinkingFunds }: SinkingFundTimelineProps) {
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const handleRenew = async (id: string) => {
    setRenewingId(id);
    try {
      await renewSubscription(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to renew');
    } finally {
      setRenewingId(null);
    }
  };

  return (
    <div className="ledger-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-wide">
              Sinking Funds &amp; Renewal Timeline
            </h3>
            <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[10px] font-mono text-violet-300 border border-violet-500/20">
              84d &amp; Multi-Month Cadences
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Amortized daily reserve targets preventing lumpsum billing shocks
          </p>
        </div>

        <Link
          href="/subscriptions"
          className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium group"
        >
          <span>View All</span>
          <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      {sinkingFunds.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Repeat className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-white">No Sinking Funds Configured</h4>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Smooth out non-monthly spikes (like 84-day mobile plans or half-yearly Wi-Fi) with automated daily reserve tracking.
          </p>
          <div className="mt-4">
            <Link
              href="/subscriptions"
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-violet-600/20 active:scale-95 transition-all"
            >
              <span>+ Add Sinking Fund</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sinkingFunds.map((fund) => {
            const days = fund.days_remaining ?? 0;
            const isUrgent = days <= 3;
            const isRoutine = days <= 7 && days > 3;

            return (
              <div
                key={fund.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#090D16]/70 p-3.5 hover:border-white/15 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${
                      isUrgent
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                        : isRoutine
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                        : 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                    }`}
                  >
                    <Repeat className="h-4 w-4" />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-white tracking-tight">{fund.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className="font-mono">{formatINR(fund.billing_amount)}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-mono">
                        {formatINR(fund.daily_amortized_burn || 0)}/day
                      </span>
                      <span>•</span>
                      <span className="text-slate-400">
                        {fund.cadence_unit === 'HALF_YEARLY'
                          ? 'Every 6 Months'
                          : fund.cadence_unit === 'MONTHLY'
                          ? 'Monthly'
                          : fund.cadence_unit === 'QUARTERLY'
                          ? 'Every 3 Months'
                          : fund.cadence_unit === 'YEARLY'
                          ? 'Annual'
                          : `Every ${fund.interval_days} days`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  {/* Countdown Badge */}
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono font-semibold ${
                        isUrgent
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse'
                          : isRoutine
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>{days <= 0 ? 'Due Today' : `${days}d left`}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Due: {fund.next_due_date}
                    </div>
                  </div>

                  {/* 1-Click Renew Button */}
                  <button
                    onClick={() => handleRenew(fund.id)}
                    disabled={renewingId === fund.id}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {renewingId === fund.id ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border border-violet-400 border-t-transparent" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Renew</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
