'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DebtLent } from '@/lib/types';
import { formatINR } from '@/lib/formatters';
import { settleDebtPayment } from '@/lib/actions';
import {
  HandCoins,
  ArrowUpRight,
  Check,
  X,
  User,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface UdhaarWatchlistProps {
  debts: DebtLent[];
  wallets: { id: string; name: string }[];
}

export default function UdhaarWatchlist({ debts, wallets }: UdhaarWatchlistProps) {
  const [selectedDebt, setSelectedDebt] = useState<DebtLent | null>(null);
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>(wallets[0]?.id || '');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const activeDebts = debts.filter(
    (d) => d.status === 'OUTSTANDING' || d.status === 'PARTIALLY_SETTLED'
  );

  const openRepaymentModal = (debt: DebtLent) => {
    setSelectedDebt(debt);
    setRepayAmount((debt.remaining_balance || debt.principal_amount).toString());
    setNotes('');
    setErrorMsg('');
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    const amount = parseFloat(repayAmount);
    if (!amount || amount <= 0) {
      setErrorMsg('Please enter a valid repayment amount');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await settleDebtPayment({
        debtId: selectedDebt.id,
        walletId: selectedWallet,
        amountReturned: amount,
        notes: notes.trim() || undefined,
      });

      setSelectedDebt(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record repayment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ledger-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-wide">
              Active Debt (Udhaar) Watchlist
            </h3>
            <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/20">
              Receivables
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Loans lent out with 1-tap balance restoration upon repayment
          </p>
        </div>

        <Link
          href="/debts"
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium group"
        >
          <span>Manage Debts</span>
          <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      {activeDebts.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <HandCoins className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-white">No Active Loans Given</h4>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Lent money to friends or relatives? Log it here to track counterparty receivables without distorting your income or expense metrics.
          </p>
          <div className="mt-4">
            <Link
              href="/debts"
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/20 active:scale-95 transition-all"
            >
              <span>+ Record New Loan</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activeDebts.slice(0, 4).map((debt) => {
            const balance = debt.remaining_balance ?? debt.principal_amount;
            const isPartial = debt.status === 'PARTIALLY_SETTLED';

            return (
              <div
                key={debt.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#090D16]/70 p-3.5 hover:border-white/15 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <User className="h-4 w-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white tracking-tight">
                        {debt.counterparty_name}
                      </h4>
                      {isPartial && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-mono text-amber-400 border border-amber-500/20">
                          Partial
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>Lent: {formatINR(debt.principal_amount)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-500 font-mono">
                        <Clock className="h-3 w-3" />
                        {debt.days_elapsed}d ago
                      </span>
                      {debt.notes && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[120px] text-slate-500">{debt.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-cyan-300 tabular-num">
                      {formatINR(balance)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Owed</div>
                  </div>

                  {/* 1-Tap Repay Button */}
                  <button
                    onClick={() => openRepaymentModal(debt)}
                    className="flex items-center gap-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 text-xs font-semibold active:scale-95 transition-all"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Settle</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Repayment Modal */}
      {selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white">Record Debt Repayment</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Receiving funds from {selectedDebt.counterparty_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedDebt(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSettleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Repayment Amount (Owed: {formatINR(selectedDebt.remaining_balance || selectedDebt.principal_amount)})
                </label>
                <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-[#090D16] px-3">
                  <span className="text-lg font-bold text-cyan-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    className="w-full bg-transparent py-2.5 pl-2 text-lg font-bold text-white tabular-num outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Deposit into Account</label>
                <select
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#0F172A]">
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Repayment Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI transfer reference, Cash return"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-300/90 leading-relaxed">
                ℹ️ This will atomically credit your liquid wallet balance without inflating your earned income metric.
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>Confirm Repayment</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
