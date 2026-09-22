'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Flame,
  Sparkles,
  Check,
  Utensils,
  ShoppingCart,
  Zap,
  Coffee,
  Cpu,
  Heart,
  HandCoins,
  CreditCard,
  Building2,
  Smartphone,
  Banknote,
  Search,
  Wifi,
  Activity,
  Home,
  ShieldCheck,
  Terminal,
  Cookie,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { logQuickExpense } from '@/lib/actions';

interface CategoryOption {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

interface WalletOption {
  id: string;
  name: string;
  account_type?: string;
  status?: string;
  current_balance?: number;
}

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: CategoryOption[];
  wallets?: WalletOption[];
}

// Icon mapper for categories
const getCategoryIconComponent = (name: string = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('coffee') || lower.includes('cafe')) return Coffee;
  if (lower.includes('food') || lower.includes('dining') || lower.includes('outing')) return Utensils;
  if (lower.includes('grocer')) return ShoppingCart;
  if (lower.includes('snack')) return Cookie;
  if (lower.includes('rent') || lower.includes('living')) return Home;
  if (lower.includes('telecom') || lower.includes('mobile')) return Smartphone;
  if (lower.includes('fiber') || lower.includes('wifi') || lower.includes('broadband')) return Wifi;
  if (lower.includes('fitness') || lower.includes('health')) return Activity;
  if (lower.includes('impulse')) return Flame;
  if (lower.includes('necessit')) return ShieldCheck;
  if (lower.includes('personal') || lower.includes('care') || lower.includes('groom')) return Heart;
  if (lower.includes('software') || lower.includes('ai') || lower.includes('tool')) return Terminal;
  if (lower.includes('tech') || lower.includes('hardware') || lower.includes('device')) return Cpu;
  if (lower.includes('spontaneous') || lower.includes('shopping')) return Sparkles;
  if (lower.includes('utilit') || lower.includes('sinking')) return Zap;
  return ShoppingCart;
};

const getWalletIconComponent = (type?: string) => {
  switch (type) {
    case 'UPI':
      return Smartphone;
    case 'CASH':
      return Banknote;
    case 'CREDIT':
      return CreditCard;
    case 'BANK':
    default:
      return Building2;
  }
};

export default function QuickLogModal({
  isOpen,
  onClose,
  categories: initialCategories = [],
  wallets: initialWallets = [],
}: QuickLogModalProps) {
  const [liveWallets, setLiveWallets] = useState<WalletOption[]>(initialWallets);
  const [liveCategories, setLiveCategories] = useState<CategoryOption[]>(initialCategories);
  const [isLoadingWallets, setIsLoadingWallets] = useState<boolean>(false);

  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [intent, setIntent] = useState<'NECESSITY' | 'IMPULSE'>('NECESSITY');
  const [type, setType] = useState<'EXPENSE' | 'LENT'>('EXPENSE');
  const [counterparty, setCounterparty] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [categorySearch, setCategorySearch] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync active wallets & unique categories on open
  useEffect(() => {
    if (isOpen) {
      setIsLoadingWallets(true);
      fetch('/api/wallets/active')
        .then((res) => {
          if (!res.ok) throw new Error('Network error');
          return res.json();
        })
        .then((data) => {
          if (data.wallets && Array.isArray(data.wallets)) {
            const activeOnly = data.wallets.filter((w: WalletOption) => w.status === 'ACTIVE' || !w.status);
            setLiveWallets(activeOnly);
            setSelectedWallet((prev) => {
              if (prev && activeOnly.some((w: WalletOption) => w.id === prev)) return prev;
              return activeOnly[0]?.id || '';
            });
          }
          if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
            // Deduplicate categories strictly by trimmed lowercase name
            const uniqueCats = data.categories.filter(
              (c: CategoryOption, idx: number, arr: CategoryOption[]) =>
                idx === arr.findIndex((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase())
            );
            setLiveCategories(uniqueCats);
            setSelectedCategory((prev) => {
              if (prev && uniqueCats.some((c: CategoryOption) => c.id === prev)) return prev;
              return uniqueCats[0]?.id || '';
            });
          }
        })
        .catch((err) => console.error('Failed to sync active wallets:', err))
        .finally(() => setIsLoadingWallets(false));

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setAmountStr('');
      setCounterparty('');
      setNotes('');
      setErrorMsg('');
      setIntent('NECESSITY');
      setType('EXPENSE');
      setShowAllCategories(false);
      setCategorySearch('');
    }
  }, [isOpen]);

  // Keyboard shortcut listener for ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleIncrement = (increment: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + increment).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amount = parseFloat(amountStr);
    if (!amount || isNaN(amount) || amount <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    if (type === 'LENT' && !counterparty.trim()) {
      setErrorMsg('Please enter counterparty name for Udhaar');
      return;
    }

    if (!selectedWallet) {
      setErrorMsg('Please select an active account / wallet');
      return;
    }

    setIsSubmitting(true);
    try {
      await logQuickExpense({
        amount,
        categoryId: type === 'EXPENSE' ? selectedCategory : null,
        walletId: selectedWallet,
        intent: type === 'LENT' ? 'DISCRETIONARY' : intent,
        type,
        counterpartyName: counterparty.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to log transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter categories for search
  const filteredCategories = liveCategories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  // Top 6 primary quick-pick categories
  const topCategories = liveCategories.slice(0, 6);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative w-full max-w-xl rounded-t-3xl sm:rounded-2xl border border-white/10 bg-[#0B101D] p-5 sm:p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 shadow-sm shadow-violet-500/10">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    Quick Log Transaction
                    <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[10px] font-mono text-violet-300">
                      &lt; 8s
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Instant double-entry ledger entry</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* 1. Large Neo-Fintech Numeric Display */}
              <div className="rounded-2xl bg-[#060911] border border-white/10 p-5 text-center focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all shadow-inner">
                <label className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                  Transaction Amount (INR)
                </label>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-violet-400 select-none">₹</span>
                  <input
                    ref={inputRef}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-56 bg-transparent text-4xl sm:text-5xl font-black text-white text-center font-mono tabular-nums outline-none placeholder:text-slate-700"
                    required
                  />
                </div>

                {/* Quick Add Chips */}
                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                  {[100, 500, 2000, 5000].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handleIncrement(inc)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-slate-300 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-white active:scale-95 transition-all"
                    >
                      +₹{inc.toLocaleString('en-IN')}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmountStr('')}
                    className="rounded-lg border border-white/5 bg-transparent px-2.5 py-1 text-xs font-mono text-slate-500 hover:text-slate-300"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* 2. Operational Switch: Self Paid vs Lent Money (Udhaar) */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#060911] p-1.5 border border-white/5">
                <button
                  type="button"
                  onClick={() => setType('EXPENSE')}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
                    type === 'EXPENSE'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Self Paid Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('LENT')}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
                    type === 'LENT'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <HandCoins className="h-3.5 w-3.5" />
                  Lent Money (Udhaar)
                </button>
              </div>

              {/* Counterparty Prompt (Only if LENT) */}
              {type === 'LENT' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-300">Borrower / Counterparty Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma, Amit, Cousin"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#060911] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
              ) : (
                /* 3. Sleek Non-Truncated Category Selector */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowAllCategories((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300"
                    >
                      <span>{showAllCategories ? 'Show Quick Picks' : `All Categories (${liveCategories.length})`}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${showAllCategories ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {!showAllCategories ? (
                    /* Top Quick Picks - High Quality Clean Badges */
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {topCategories.map((cat) => {
                        const Icon = getCategoryIconComponent(cat.name);
                        const isSelected = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all text-left ${
                              isSelected
                                ? 'border-violet-500 bg-violet-600/25 text-white shadow-sm shadow-violet-500/20 ring-1 ring-violet-500'
                                : 'border-white/5 bg-[#060911] text-slate-400 hover:border-white/15 hover:text-white'
                            }`}
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                                isSelected ? 'bg-violet-500/30 text-violet-300' : 'bg-white/5 text-slate-400'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="truncate">{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Full Category Drawer with Filter Search */
                    <div className="rounded-xl border border-white/10 bg-[#060911] p-3 space-y-2.5">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search categories (e.g. food, tech, rent)..."
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-[#0B101D] pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {filteredCategories.map((cat) => {
                          const Icon = getCategoryIconComponent(cat.name);
                          const isSelected = selectedCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(cat.id);
                                setShowAllCategories(false);
                              }}
                              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-all text-left ${
                                isSelected
                                  ? 'border-violet-500 bg-violet-600/30 text-white'
                                  : 'border-white/5 hover:bg-white/5 text-slate-300'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                              <span className="truncate">{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Intent Switch (Planned vs Impulse) */}
              {type === 'EXPENSE' && (
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#060911] p-3">
                  <div className="flex items-center gap-2.5">
                    {intent === 'IMPULSE' ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <Flame className="h-4 w-4 animate-bounce" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">
                        {intent === 'IMPULSE' ? 'Impulse Purchase' : 'Planned Outflow'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {intent === 'IMPULSE' ? 'Drives up Impulse Drain Ratio' : 'Disciplined budgeted expense'}
                      </div>
                    </div>
                  </div>

                  <div className="flex rounded-lg bg-[#0B101D] p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setIntent('NECESSITY')}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                        intent === 'NECESSITY' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Planned
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntent('IMPULSE')}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                        intent === 'IMPULSE' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Impulse
                    </button>
                  </div>
                </div>
              )}

              {/* 5. Wallet Selector (Active Accounts Only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Payment Account</label>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {liveWallets.length} active
                  </span>
                </div>

                {isLoadingWallets && liveWallets.length === 0 ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                    <span>Syncing active accounts...</span>
                  </div>
                ) : liveWallets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-3.5 text-center">
                    <p className="text-xs text-amber-300 font-medium">No active accounts found.</p>
                    <a
                      href="/wallets"
                      onClick={onClose}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300 underline"
                    >
                      Create your first wallet in Accounts &amp; Wallets
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {liveWallets.map((w) => {
                      const Icon = getWalletIconComponent(w.account_type);
                      const isSelected = selectedWallet === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSelectedWallet(w.id)}
                          className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all text-left ${
                            isSelected
                              ? 'border-violet-500 bg-violet-600/25 text-white shadow-sm ring-1 ring-violet-500'
                              : 'border-white/5 bg-[#060911] text-slate-400 hover:border-white/15 hover:text-white'
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              isSelected ? 'bg-violet-500/30 text-violet-300' : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-white">{w.name}</p>
                            <p className="text-[10px] font-mono text-slate-500 uppercase">{w.account_type || 'BANK'}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 6. Optional Note Input */}
              <div>
                <input
                  type="text"
                  placeholder="Optional transaction memo or note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-[#060911] px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-500 py-3 text-sm font-bold text-white shadow-xl shadow-violet-600/25 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>Confirm &amp; Log Record (⏎)</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
