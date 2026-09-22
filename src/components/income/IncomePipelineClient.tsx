'use client';

import { useState } from 'react';
import { IncomeSource, AccountWallet } from '@/lib/types';
import { formatINR } from '@/lib/formatters';
import { transitionIncomeReceived, createIncomeSource } from '@/lib/actions';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building,
  Briefcase,
  X,
  Check,
} from 'lucide-react';

interface IncomePipelineClientProps {
  incomeSources: IncomeSource[];
  wallets: AccountWallet[];
}

export default function IncomePipelineClient({
  incomeSources,
  wallets,
}: IncomePipelineClientProps) {
  const [selectedIncome, setSelectedIncome] = useState<IncomeSource | null>(null);
  const [targetWallet, setTargetWallet] = useState(wallets[0]?.id || '');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formSourceType, setFormSourceType] = useState('FREELANCE');
  const [formClient, setFormClient] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pendingSources = incomeSources.filter((s) => s.status === 'PENDING');
  const receivedSources = incomeSources.filter((s) => s.status === 'RECEIVED');

  const totalPending = pendingSources.reduce((acc, curr) => acc + curr.expected_amount, 0);
  const totalReceived = receivedSources.reduce((acc, curr) => acc + curr.expected_amount, 0);

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncome) return;

    setIsTransitioning(true);
    try {
      await transitionIncomeReceived(selectedIncome.id, targetWallet);
      setSelectedIncome(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to transition income');
    } finally {
      setIsTransitioning(false);
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
      await createIncomeSource({
        sourceType: formSourceType,
        clientOrEmployer: formClient.trim(),
        expectedAmount: amount,
        dueDate: formDueDate,
        notes: formNotes || undefined,
      });

      setIsAddModalOpen(false);
      setFormClient('');
      setFormAmount('');
      setFormNotes('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create income source');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="ledger-card p-5 border-blue-500/20 bg-blue-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
              Pending Inflow Pipeline (Unreceived)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-blue-300 tabular-num">
              {formatINR(totalPending)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {pendingSources.length} invoice(s) awaiting bank credit. Strictly excluded from spendable cash.
            </p>
          </div>
        </div>

        <div className="ledger-card p-5 border-emerald-500/20 bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
              Cleared &amp; Realized Inflows
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-emerald-300 tabular-num">
              {formatINR(totalReceived)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Successfully credited into your liquid wallets.
            </p>
          </div>
        </div>
      </div>

      {/* Pending Pipeline Stage */}
      <div className="ledger-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Expected Inflow Pipeline
              </h3>
              <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono text-blue-300 border border-blue-500/20">
                Accrual Space
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pending contract receivables and salary milestones
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expected Inflow</span>
          </button>
        </div>

        {pendingSources.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-xl">
            <p className="text-xs text-slate-400">No pending income invoices. All contracts settled!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingSources.map((source) => (
              <div
                key={source.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#090D16] p-4 hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {source.source_type === 'SALARY' ? (
                      <Building className="h-4 w-4" />
                    ) : (
                      <Briefcase className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {source.client_or_employer}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className="font-mono text-blue-300">{source.source_type}</span>
                      <span>•</span>
                      <span>Due: {source.due_date}</span>
                      {source.notes && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500">{source.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-right">
                    <div className="text-base font-bold text-white tabular-num">
                      {formatINR(source.expected_amount)}
                    </div>
                    <span className="text-[10px] text-blue-400 font-mono">Unreceived</span>
                  </div>

                  {/* 1-Click Action to Mark Received in Bank */}
                  <button
                    onClick={() => setSelectedIncome(source)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>Mark Received</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cleared History */}
      <div className="ledger-card p-6">
        <h3 className="text-base font-bold text-white tracking-wide mb-3">
          Recently Cleared Inflows
        </h3>
        <div className="space-y-2">
          {receivedSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-3 rounded-xl bg-[#090D16]/50 border border-white/5 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">{source.client_or_employer}</div>
                  <div className="text-[11px] text-slate-500">Credited to wallet</div>
                </div>
              </div>
              <div className="text-right font-bold text-emerald-400 tabular-num">
                +{formatINR(source.expected_amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mark Received Modal */}
      {selectedIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white">Credit Income into Bank</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm receipt of {formatINR(selectedIncome.expected_amount)} from {selectedIncome.client_or_employer}
                </p>
              </div>
              <button
                onClick={() => setSelectedIncome(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Receiving Account / Wallet</label>
                {wallets.length === 0 ? (
                  <div className="mt-1 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                    No liquid wallets found. Please create a wallet from the Dashboard setup first before depositing funds.
                  </div>
                ) : (
                  <select
                    value={targetWallet}
                    onChange={(e) => setTargetWallet(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:outline-none"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id} className="bg-[#0F172A]">
                        {w.name} ({formatINR(w.current_balance || 0)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-300/90 leading-relaxed">
                ✓ This atomic transaction will update the pipeline status to <strong>RECEIVED</strong> and instantly deposit <strong>{formatINR(selectedIncome.expected_amount)}</strong> into your spendable liquid balance.
              </div>

              <button
                type="submit"
                disabled={isTransitioning || wallets.length === 0}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isTransitioning ? 'Depositing...' : 'Confirm Deposit to Liquid Pool'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Expected Inflow Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Record Expected Income Pipeline</h3>
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

            {/* Quick Income Presets */}
            <div className="mt-3">
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Quick Pipeline Presets
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[
                  { label: '💼 Primary Salary', type: 'SALARY', client: 'Primary Employer', notes: 'Monthly Salary Inflow' },
                  { label: '💻 Freelance Retainer', type: 'FREELANCE', client: 'Active Client Retainer', notes: 'Monthly Freelance Retainer' },
                  { label: '📈 Dividend / Payout', type: 'INVESTMENT', client: 'Broker / Asset Yield', notes: 'Quarterly Distribution' },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setFormSourceType(p.type);
                      setFormClient(p.client);
                      setFormNotes(p.notes);
                    }}
                    className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-300 hover:bg-blue-500/20 active:scale-95 transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Income Type</label>
                  <select
                    value={formSourceType}
                    onChange={(e) => setFormSourceType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="SALARY">Salary</option>
                    <option value="FREELANCE">Freelance</option>
                    <option value="INVESTMENT">Investment Return</option>
                    <option value="GIFT">Gift / Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Expected Due Date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none focus:border-blue-500 cursor-pointer transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Client / Employer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp, Upwork Project"
                  value={formClient}
                  onChange={(e) => setFormClient(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-xs text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Expected Amount (INR)</label>
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

              <div>
                <label className="text-xs font-medium text-slate-300">Milestone Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Milestone 1 Sprint Deliverable"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-xs font-bold text-white disabled:opacity-50 transition-all"
              >
                {isSubmitting ? 'Registering...' : 'Register Inflow Pipeline'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
