'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CategoryDistribution } from '@/lib/types';
import { formatINR } from '@/lib/formatters';
import { Flame, ShieldCheck, AlertCircle } from 'lucide-react';

interface CategoryImpulseDonutProps {
  categories: CategoryDistribution[];
  impulseDrainRate: number;
  impulseTotalAmount: number;
  impulseStatus: 'DISCIPLINED' | 'DRIFT' | 'HEMORRHAGE';
}

const DEFAULT_COLORS = ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899', '#F43F5E', '#06B6D4'];

export default function CategoryImpulseDonut({
  categories,
  impulseDrainRate,
  impulseTotalAmount,
  impulseStatus,
}: CategoryImpulseDonutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasSpend = categories.length > 0 && categories.some((c) => c.amount > 0);

  if (!mounted && hasSpend) {
    return (
      <div className="ledger-card p-6 h-[340px] flex items-center justify-center">
        <span className="text-xs text-slate-500 font-mono">Loading category distribution...</span>
      </div>
    );
  }

  const roundedRate = Math.round(impulseDrainRate * 10) / 10;

  const getStatusBadge = () => {
    if (impulseStatus === 'DISCIPLINED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          <ShieldCheck className="h-3 w-3" />
          Disciplined (&lt;5%)
        </span>
      );
    }
    if (impulseStatus === 'DRIFT') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
          <AlertCircle className="h-3 w-3" />
          Nominal Drift (5-15%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400">
        <Flame className="h-3 w-3" />
        Hemorrhage (&gt;15%)
      </span>
    );
  };

  return (
    <div className="ledger-card p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-wide">Category &amp; Impulse Radar</h3>
          {hasSpend ? (
            getStatusBadge()
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium text-slate-400">
              <ShieldCheck className="h-3 w-3" />
              Zero Outflows
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Proportion of capital claimed by spontaneous purchases
        </p>
      </div>

      {hasSpend ? (
        <>
          {/* Donut Chart with Center Callout */}
          <div className="relative my-2 h-[180px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0]?.payload as CategoryDistribution;
                      return (
                        <div className="rounded-xl border border-white/10 bg-[#0F172A] p-2.5 shadow-xl text-xs tabular-num">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </div>
                          <div className="text-slate-300 mt-1">{formatINR(item.amount)} ({item.percentage}%)</div>
                          {item.impulseAmount > 0 && (
                            <div className="text-rose-400 text-[11px] mt-0.5">
                              Impulses: {formatINR(item.impulseAmount)}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={categories}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={75}
                  stroke="none"
                  paddingAngle={3}
                >
                  {categories.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Impulse Callout */}
            <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-extrabold tabular-num text-white">{roundedRate}%</span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400 flex items-center gap-0.5">
                <Flame className="h-2.5 w-2.5 inline" /> Impulse
              </span>
            </div>
          </div>

          {/* Category Mini Legend */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {categories.slice(0, 4).map((c, i) => (
              <div key={c.id} className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: c.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }}
                  />
                  <span className="truncate text-slate-300">{c.name}</span>
                </span>
                <span className="font-mono text-slate-400">{c.percentage}%</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Muted Elegant Empty State */
        <div className="my-6 flex flex-col items-center justify-center text-center">
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-white/10 bg-white/[0.01]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/5 bg-[#090D16]">
              <Flame className="h-6 w-6 text-slate-600" />
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-300">
            No spend logged this period
          </p>
          <p className="text-[11px] text-slate-500 max-w-[220px] mt-0.5">
            Spontaneous purchases flagged with Impulse will calibrate this radar once outflows occur.
          </p>
        </div>
      )}
    </div>
  );
}
