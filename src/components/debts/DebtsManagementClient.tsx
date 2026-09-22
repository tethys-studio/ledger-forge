'use client';

import { useState } from 'react';
import { DebtLent, AccountWallet } from '@/lib/types';
import { formatINR } from '@/lib/formatters';
import { settleDebtPayment, writeOffDebt, createTransaction } from '@/lib/actions';
import {
  HandCoins,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Plus,
  ArrowRight,
  ShieldX,
  X,
  Check,
} from 'lucide-react';

interface DebtsManagementClientProps {
  debts: DebtLent[];
  wallets: AccountWallet[];
}

export default function DebtsManagementClient({
  debts,
  wallets,
}: DebtsManagementClientProps) {
  const [selectedDebt, setSelectedDebt] = useState<DebtLent | null>(null);
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>(wallets[0]?.id || '');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Add Loan Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formCounterparty, setFormCounterparty] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formWallet, setFormWallet] = useState(wallets[0]?.id || '');
  const [formNotes, setFormNotes] = useState('');

  const activeDebts = debts.filter(
    (d) => d.status === 'OUTSTANDING' || d.status === 'PARTIALLY_SETTLED'
  );
  const settledDebts = debts.filter((d) => d.status === 'SETTLED' || d.status === 'DEFAULTED');

  const totalOutstanding = activeDebts.reduce(
    (acc, d) => acc + (d.remaining_balance ?? d.principal_amount),
    0
  );
  const totalPrincipal = debts.reduce((acc, d) => acc + d.principal_amount, 0);

  const openRepayModal = (debt: DebtLent) => {
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
      setErrorMsg('Enter a valid repayment amount');
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
      setErrorMsg(err instanceof Error ? err.message : 'Failed to settle debt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWriteOff = async (debtId: string) => {
    if (!confirm('Are you sure you want to write off this debt as uncollectible? It will be marked as DEFAULTED.')) {
      return;
    }
    try {
      await writeOffDebt(debtId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to write off debt');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) {
      setErrorMsg('Enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await createTransaction({
        walletId: formWallet,
        type: 'LENT',
        amount,
        date: formDate,
        dueDate: formDueDate || undefined,
        debtCounterparty: formCounterparty.trim(),
        notes: formNotes || undefined,
        intent: 'DISCRETIONARY',
      });

      setIsAddModalOpen(false);
      setFormCounterparty('');
      setFormAmount('');
      setFormNotes('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="ledger-card p-5 border-cyan-500/20 bg-cyan-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
              Total Active Receivables
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <HandCoins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-cyan-300 tabular-num">
              {formatINR(totalOutstanding)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {activeDebts.length} active counterparty borrower(s). Restores liquid cash upon settlement.
            </p>
          </div>
        </div>

        <div className="ledger-card p-5 border-slate-700 bg-slate-900/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Cumulative Principal Lent
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-white tabular-num">
              {formatINR(totalPrincipal)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              All lifetime loans issued to friends, family, and colleagues.
            </p>
          </div>
        </div>
      </div>

      {/* Active Receivables Section */}
      <div className="ledger-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Active Debt (Udhaar) Ledger
              </h3>
              <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/20">
                Receivables State Machine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Track outstanding counterparty loans with single-tap partial or full settlement
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Record New Loan</span>
          </button>
        </div>

        {activeDebts.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-xl">
            <p className="text-xs text-slate-400">No active loans outstanding. Zero debt exposure!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDebts.map((debt) => {
              const balance = debt.remaining_balance ?? debt.principal_amount;
              const isPartial = debt.status === 'PARTIALLY_SETTLED';

              return (
                <div
                  key={debt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#090D16] p-4 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">
                          {debt.counterparty_name}
                        </h4>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono border ${
                            isPartial
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {debt.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>Principal: {formatINR(debt.principal_amount)}</span>
                        <span>•</span>
                        <span>Lent: {debt.date_lent} ({debt.days_elapsed}d ago)</span>
                        {debt.total_settled && debt.total_settled > 0 ? (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-mono">
                              Settled: {formatINR(debt.total_settled)}
                            </span>
                          </>
                        ) : null}
                      </div>
                      {debt.notes && (
                        <p className="text-[11px] text-slate-500 mt-1">{debt.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-cyan-300 tabular-num">
                        {formatINR(balance)}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Remaining Owed</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openRepayModal(debt)}
                        className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-cyan-600/20 active:scale-95 transition-all"
                      >
                        <Check className="h-4 w-4 stroke-[3]" />
                        <span>Settle</span>
                      </button>
                      <button
                        onClick={() => handleWriteOff(debt.id)}
                        className="rounded-lg border border-white/10 p-2 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                        title="Write off uncollectible"
                      >
                        <ShieldX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Settled Loans */}
      {settledDebts.length > 0 && (
        <div className="ledger-card p-6">
          <h3 className="text-base font-bold text-white tracking-wide mb-3">
            Settled &amp; Closed Loans
          </h3>
          <div className="space-y-2">
            {settledDebts.map((debt) => (
              <div
                key={debt.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#090D16]/50 border border-white/5 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      debt.status === 'SETTLED'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{debt.counterparty_name}</div>
                    <div className="text-[11px] text-slate-500">
                      Lent on {debt.date_lent} • {debt.status}
                    </div>
                  </div>
                </div>
                <div className="text-right font-bold text-slate-400 tabular-num">
                  {formatINR(debt.principal_amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repay Settlement Modal */}
      {selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white">Record Debt Settlement</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Receiving repayment from {selectedDebt.counterparty_name}
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
                <input
                  type="number"
                  step="any"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-base font-bold text-white tabular-num outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Deposit into Wallet</label>
                <select
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-xs text-white outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#0F172A]">
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Settlement Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Returned via UPI, Cash handed over"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-300/90 leading-relaxed">
                ℹ️ Restores your liquid wallet balance atomically without triggering false income taxes or altering earned revenue metrics.
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 py-3 text-xs font-bold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Recording...' : 'Confirm Repayment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record New Loan Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Record New Loan Lent Out</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Borrower / Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formCounterparty}
                  onChange={(e) => setFormCounterparty(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-xs text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Principal Amount (INR)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-base font-bold text-white tabular-num outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Date Lent</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Expected Due Date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Disbursed From Account</label>
                <select
                  value={formWallet}
                  onChange={(e) => setFormWallet(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2 text-xs text-white outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#0F172A]">
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Loan Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Car repair advance, Trip tickets"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 py-3 text-xs font-bold text-white disabled:opacity-50 transition-all"
              >
                {isSubmitting ? 'Recording...' : 'Disburse & Track Receivable'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
