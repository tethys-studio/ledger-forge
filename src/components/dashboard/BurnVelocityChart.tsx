'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { BurnVelocityPoint } from '@/lib/types';
import { formatINR } from '@/lib/formatters';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface BurnVelocityChartProps {
  data: BurnVelocityPoint[];
  monthlyBudget: number;
}

export default function BurnVelocityChart({ data, monthlyBudget }: BurnVelocityChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="ledger-card p-6 h-[340px] flex items-center justify-center">
        <span className="text-xs text-slate-500 font-mono">Calibrating velocity slope...</span>
      </div>
    );
  }

  return (
    <div className="ledger-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-wide">Burn Velocity Trajectory</h3>
            <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[10px] font-mono text-violet-300 border border-violet-500/20">
              Cumulative MTD
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compares actual spending slope against the linear daily pace limit
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            <span className="text-slate-300">Actual Outflow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-emerald-400/80" />
            <span className="text-slate-300">Target Slope</span>
          </div>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const actual = payload[0]?.value as number;
                  const ideal = payload[1]?.value as number;
                  const diff = actual - ideal;
                  return (
                    <div className="rounded-xl border border-white/10 bg-[#0F172A] p-3 shadow-xl backdrop-blur-md">
                      <p className="text-xs font-semibold text-slate-300 mb-1.5">{label}</p>
                      <div className="space-y-1 text-xs tabular-num">
                        <div className="flex justify-between gap-4 text-violet-300">
                          <span>Actual Spent:</span>
                          <span className="font-bold">{formatINR(actual)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-emerald-400">
                          <span>Target Slope:</span>
                          <span className="font-medium">{formatINR(ideal)}</span>
                        </div>
                        <div className={`flex justify-between gap-4 pt-1 border-t border-white/5 font-semibold ${
                          diff > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          <span>Variance:</span>
                          <span>{diff > 0 ? `+${formatINR(diff)} over` : `${formatINR(Math.abs(diff))} under`}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="actualSpend"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#spendGradient)"
            />
            <Area
              type="linear"
              dataKey="idealSlope"
              stroke="#10B981"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
