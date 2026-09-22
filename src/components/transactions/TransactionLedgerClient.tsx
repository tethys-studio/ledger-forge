'use client';

import { useState } from 'react';
import { Transaction, Category, AccountWallet } from '@/lib/types';
import { formatINR } from '@/lib/formatters';
import { deleteTransaction, createTransaction } from '@/lib/actions';
import {
  Search,
  Filter,
  Flame,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Tag,
  X,
  Check,
} from 'lucide-react';

interface TransactionLedgerClientProps {
  initialTransactions: Transaction[];
  categories: Category[];
  wallets: AccountWallet[];
}

export default function TransactionLedgerClient({
  initialTransactions,
  categories,
  wallets,
}: TransactionLedgerClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedWallet, setSelectedWallet] = useState<string>('ALL');
  const [selectedIntent, setSelectedIntent] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formType, setFormType] = useState<'EXPENSE' | 'INCOME' | 'LENT'>('EXPENSE');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState(categories[0]?.id || '');
  const [formWallet, setFormWallet] = useState(wallets[0]?.id || '');
  const [formIntent, setFormIntent] = useState<'NECESSITY' | 'INVESTMENT' | 'DISCRETIONARY' | 'IMPULSE'>('NECESSITY');
  const [formCounterparty, setFormCounterparty] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter logic
  const filteredTransactions = initialTransactions.filter((tx) => {
    const matchesSearch =
      (tx.notes && tx.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.category_name && tx.category_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.counterparty_name && tx.counterparty_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || tx.category_id === selectedCategory;
    const matchesWallet = selectedWallet === 'ALL' || tx.wallet_id === selectedWallet;
    const matchesIntent = selectedIntent === 'ALL' || tx.intent === selectedIntent;

    return matchesSearch && matchesCategory && matchesWallet && matchesIntent;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ledger entry?')) return;
    setDeletingId(id);
    try {
      await deleteTransaction(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
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
        categoryId: formType === 'EXPENSE' ? formCategory : null,
        type: formType,
        amount,
        date: formDate,
        intent: formType === 'EXPENSE' ? formIntent : 'NECESSITY',
        debtCounterparty: formType === 'LENT' ? formCounterparty : undefined,
        notes: formNotes || undefined,
      });

      setIsAddModalOpen(false);
      setFormAmount('');
      setFormNotes('');
      setFormCounterparty('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Filters */}
      <div className="ledger-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by notes, category, or counterparty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#090D16] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Entry</span>
          </button>
        </div>

        {/* Filter Badges Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs">
          <div className="flex items-center gap-1 text-slate-400 mr-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#090D16] px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Wallet Dropdown */}
          <select
            value={selectedWallet}
            onChange={(e) => setSelectedWallet(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#090D16] px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Wallets</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Intent Dropdown */}
          <select
            value={selectedIntent}
            onChange={(e) => setSelectedIntent(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#090D16] px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Intents</option>
            <option value="NECESSITY">Necessity</option>
            <option value="INVESTMENT">Investment</option>
            <option value="DISCRETIONARY">Discretionary</option>
            <option value="IMPULSE">Impulse</option>
          </select>

          {(selectedCategory !== 'ALL' || selectedWallet !== 'ALL' || selectedIntent !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedWallet('ALL');
                setSelectedIntent('ALL');
                setSearchTerm('');
              }}
              className="text-xs text-violet-400 hover:underline ml-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="ledger-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/5 text-[11px] font-medium uppercase text-slate-500 font-mono">
              <tr>
                <th className="pb-3 pl-2">Date</th>
                <th className="pb-3">Description &amp; Category</th>
                <th className="pb-3">Account</th>
                <th className="pb-3">Intent / Class</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No transactions match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
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
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: tx.category_color || '#8B5CF6' }}
                            />
                            <span>{tx.category_name}</span>
                          </div>
                        )}
                        {tx.counterparty_name && (
                          <div className="text-[11px] text-cyan-400 mt-0.5">
                            Borrower: {tx.counterparty_name}
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
                            Debt Repayment
                          </span>
                        ) : tx.type === 'TRANSFER' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300 border border-violet-500/20">
                            Sweep Transfer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                            {tx.intent || tx.type}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap font-extrabold tabular-num">
                        <span className={isPositive ? 'text-emerald-400' : 'text-white'}>
                          {isPositive ? '+' : '-'}{formatINR(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          disabled={deletingId === tx.id}
                          className="rounded p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custom Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Add Master Ledger Entry</h3>
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
                <label className="text-xs font-medium text-slate-300">Transaction Type</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(['EXPENSE', 'INCOME', 'LENT'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={`rounded-lg py-2 text-xs font-semibold border transition-all ${
                        formType === t
                          ? 'border-violet-500 bg-violet-600 text-white'
                          : 'border-white/10 bg-[#090D16] text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Amount (INR)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-base font-bold text-white tabular-num outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none focus:border-violet-500 cursor-pointer transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Account</label>
                  <select
                    value={formWallet}
                    onChange={(e) => setFormWallet(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id} className="bg-[#0F172A]">
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formType === 'EXPENSE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#0F172A]">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300">Intent Tag</label>
                    <select
                      value={formIntent}
                      onChange={(e) => setFormIntent(e.target.value as any)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="NECESSITY" className="bg-[#0F172A]">Necessity</option>
                      <option value="INVESTMENT" className="bg-[#0F172A]">Investment</option>
                      <option value="DISCRETIONARY" className="bg-[#0F172A]">Discretionary</option>
                      <option value="IMPULSE" className="bg-[#0F172A]">Impulse</option>
                    </select>
                  </div>
                </div>
              )}

              {formType === 'LENT' && (
                <div>
                  <label className="text-xs font-medium text-slate-300">Borrower Counterparty</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={formCounterparty}
                    onChange={(e) => setFormCounterparty(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-300">Notes / Narrative</label>
                <input
                  type="text"
                  placeholder="Optional details or invoice reference"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-violet-600 py-3 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Recording...' : 'Commit to Ledger'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
