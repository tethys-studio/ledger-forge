'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Building2,
  Smartphone,
  Banknote,
  CreditCard,
  Plus,
  Edit3,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Check,
  X,
  Sparkles,
  TrendingUp,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';
import { AccountWallet } from '@/lib/types';
import { formatINR } from '@/lib/formatters';
import {
  createWallet,
  updateWallet,
  suspendAndSweepWallet,
  reactivateWallet,
} from '@/lib/actions';

interface WalletsManagementClientProps {
  initialWallets: AccountWallet[];
}

export default function WalletsManagementClient({
  initialWallets,
}: WalletsManagementClientProps) {
  const router = useRouter();

  // Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<AccountWallet | null>(null);
  const [suspendingWallet, setSuspendingWallet] = useState<AccountWallet | null>(null);

  // Form States for Create
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState<'BANK' | 'UPI' | 'CASH' | 'CREDIT'>('BANK');
  const [createBalanceStr, setCreateBalanceStr] = useState('0');
  const [createIsLiquid, setCreateIsLiquid] = useState(true);

  // Form States for Edit
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'BANK' | 'UPI' | 'CASH' | 'CREDIT'>('BANK');
  const [editIsLiquid, setEditIsLiquid] = useState(true);

  // Form States for Suspend & Sweep
  const [sweepTargetWalletId, setSweepTargetWalletId] = useState('');
  const [sweepNotes, setSweepNotes] = useState('');

  // Status and feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Account Collections
  const activeWallets = initialWallets.filter(
    (w) => w.status === 'ACTIVE' || !w.status
  );
  const suspendedWallets = initialWallets.filter(
    (w) => w.status === 'SUSPENDED'
  );

  // Total Net Liquid Wealth across active liquid wallets
  const totalNetLiquidWealth = activeWallets.reduce(
    (acc, w) => acc + (w.is_liquid ? (w.current_balance || 0) : 0),
    0
  );

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // 1. Create Wallet Handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const balance = parseFloat(createBalanceStr);
    if (isNaN(balance) || balance < 0) {
      setActionError('Starting balance must be 0 or a positive number');
      return;
    }

    setIsSubmitting(true);
    try {
      await createWallet({
        name: createName.trim(),
        accountType: createType,
        isLiquid: createIsLiquid,
        startingBalance: balance,
      });

      setIsCreateOpen(false);
      setCreateName('');
      setCreateBalanceStr('0');
      setCreateType('BANK');
      setCreateIsLiquid(true);
      showToast('Wallet created successfully');
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Edit Wallet Handler
  const openEditModal = (wallet: AccountWallet) => {
    setActionError(null);
    setEditingWallet(wallet);
    setEditName(wallet.name);
    setEditType(wallet.account_type);
    setEditIsLiquid(wallet.is_liquid);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet) return;
    setActionError(null);

    setIsSubmitting(true);
    try {
      await updateWallet({
        id: editingWallet.id,
        name: editName.trim(),
        accountType: editType,
        isLiquid: editIsLiquid,
      });

      setEditingWallet(null);
      showToast('Account updated successfully');
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Suspend & Sweep Handler
  const openSuspendModal = (wallet: AccountWallet) => {
    setActionError(null);
    setSuspendingWallet(wallet);
    setSweepNotes('');

    // Pre-select first eligible destination active wallet
    const eligibleTargets = activeWallets.filter((w) => w.id !== wallet.id);
    setSweepTargetWalletId(eligibleTargets[0]?.id || '');
  };

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendingWallet) return;
    setActionError(null);

    const currentBal = suspendingWallet.current_balance || 0;
    if (currentBal > 0 && !sweepTargetWalletId) {
      setActionError('Destination account is required to sweep positive balance.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await suspendAndSweepWallet({
        sourceWalletId: suspendingWallet.id,
        targetWalletId: currentBal > 0 ? sweepTargetWalletId : null,
        notes: sweepNotes.trim() || undefined,
      });

      setSuspendingWallet(null);
      if (res.sweptAmount && res.sweptAmount > 0) {
        showToast(
          `Account suspended & ${formatINR(res.sweptAmount)} swept successfully`
        );
      } else {
        showToast('Account suspended successfully');
      }
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to suspend account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Reactivate Handler
  const handleReactivate = async (walletId: string) => {
    if (!confirm('Reactivate this account to make it available for logging and transactions?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await reactivateWallet(walletId);
      showToast('Account reactivated successfully');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reactivate account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountIcon = (type: string) => {
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

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-2.5 text-xs font-semibold text-emerald-300 shadow-xl backdrop-blur-md"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A. Hero Net Liquid Wealth Strip */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#131B2E] to-[#0B101D] p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                Total Net Liquid Wealth
              </span>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-white font-mono tabular-nums">
              {formatINR(totalNetLiquidWealth)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Aggregated spendable cash across all {activeWallets.length} active liquid accounts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Stats */}
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#090D16]/60 px-4 py-2.5">
              <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Active</div>
                  <div className="text-sm font-bold text-white">{activeWallets.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Suspended</div>
                  <div className="text-sm font-bold text-slate-300">{suspendedWallets.length}</div>
                </div>
              </div>
            </div>

            {/* Create Account Action */}
            <button
              onClick={() => {
                setActionError(null);
                setIsCreateOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/30 hover:from-violet-500 hover:to-indigo-500 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Add New Wallet</span>
            </button>
          </div>
        </div>
      </div>

      {/* B. Active Wallets Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-400" />
            Active Payment Accounts
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {activeWallets.length} available for logging
          </span>
        </div>

        {activeWallets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#0B101D] p-8 text-center">
            <Wallet className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No active accounts configured</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create your primary bank account, UPI pocket, or physical cash wallet to start logging transactions.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Wallet</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeWallets.map((wallet) => {
              const IconComponent = getAccountIcon(wallet.account_type);
              const balance = wallet.current_balance || 0;

              return (
                <motion.div
                  key={wallet.id}
                  layout
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0D1424] p-5 shadow-lg hover:border-violet-500/40 hover:shadow-violet-500/5 transition-all"
                >
                  {/* Card Top */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 group-hover:scale-105 transition-transform">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white tracking-tight">
                            {wallet.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                              {wallet.account_type}
                            </span>
                            {!wallet.is_liquid && (
                              <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                Non-Liquid
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        ACTIVE
                      </span>
                    </div>

                    {/* Balance */}
                    <div className="mt-5">
                      <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        Current Authoritative Balance
                      </div>
                      <div className="mt-1 text-2xl font-black tracking-tight text-white font-mono tabular-nums">
                        {formatINR(balance)}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openEditModal(wallet)}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => openSuspendModal(wallet)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/15 hover:border-rose-500/40 transition-colors"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Suspend &amp; Sweep</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* C. Suspended Accounts Section */}
      {suspendedWallets.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-slate-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Suspended / Terminated Accounts
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {suspendedWallets.length} closed accounts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suspendedWallets.map((wallet) => {
              const IconComponent = getAccountIcon(wallet.account_type);

              return (
                <div
                  key={wallet.id}
                  className="rounded-2xl border border-white/5 bg-[#0A0E1A]/80 p-5 opacity-75 hover:opacity-100 transition-opacity flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-500">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-300 line-through">
                            {wallet.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 uppercase">
                            {wallet.account_type} • Closed
                          </div>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400 font-mono">
                        SUSPENDED
                      </span>
                    </div>

                    <div className="mt-4 text-sm font-mono text-slate-500">
                      Balance: ₹0.00 (Swept)
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                    <button
                      onClick={() => handleReactivate(wallet.id)}
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reactivate</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Create Wallet                                                    */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
                    <Plus className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Create New Wallet / Account</h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {actionError && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Account / Wallet Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Salary, Paytm UPI, Petty Cash"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Account Type</label>
                  <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { type: 'BANK', label: 'Bank', icon: Building2 },
                      { type: 'UPI', label: 'UPI', icon: Smartphone },
                      { type: 'CASH', label: 'Cash', icon: Banknote },
                      { type: 'CREDIT', label: 'Credit', icon: CreditCard },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = createType === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setCreateType(item.type as any)}
                          className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                            isSelected
                              ? 'border-violet-500 bg-violet-500/20 text-violet-300 shadow-sm'
                              : 'border-white/5 bg-[#090D16] text-slate-400 hover:text-white'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Initial Opening Balance (₹ INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={createBalanceStr}
                    onChange={(e) => setCreateBalanceStr(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Will be recorded as initial opening liquid capital.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="createIsLiquid"
                    checked={createIsLiquid}
                    onChange={(e) => setCreateIsLiquid(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-[#090D16] text-violet-600 focus:ring-violet-500"
                  />
                  <label htmlFor="createIsLiquid" className="text-xs text-slate-300">
                    Count as Spendable Liquid Balance
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: Edit Wallet                                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {editingWallet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingWallet(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                    <Edit3 className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Edit Account Details</h3>
                </div>
                <button
                  onClick={() => setEditingWallet(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {actionError && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Account Type</label>
                  <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { type: 'BANK', label: 'Bank', icon: Building2 },
                      { type: 'UPI', label: 'UPI', icon: Smartphone },
                      { type: 'CASH', label: 'Cash', icon: Banknote },
                      { type: 'CREDIT', label: 'Credit', icon: CreditCard },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = editType === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setEditType(item.type as any)}
                          className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                            isSelected
                              ? 'border-violet-500 bg-violet-500/20 text-violet-300 shadow-sm'
                              : 'border-white/5 bg-[#090D16] text-slate-400 hover:text-white'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editIsLiquid"
                    checked={editIsLiquid}
                    onChange={(e) => setEditIsLiquid(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-[#090D16] text-violet-600 focus:ring-violet-500"
                  />
                  <label htmlFor="editIsLiquid" className="text-xs text-slate-300">
                    Count as Spendable Liquid Balance
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: Suspend & Sweep Balance Workflow                                 */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {suspendingWallet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSuspendingWallet(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-lg rounded-2xl border border-rose-500/30 bg-[#0F172A] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Suspend Account &amp; Sweep Funds</h3>
                    <p className="text-[11px] text-slate-400">
                      Closing: <span className="font-semibold text-white">{suspendingWallet.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSuspendingWallet(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {actionError && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleSuspendSubmit} className="mt-4 space-y-4">
                {/* Balance Summary Box */}
                <div className="rounded-xl border border-white/10 bg-[#090D16] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Current Account Balance</span>
                    <span className="text-lg font-black text-white font-mono">
                      {formatINR(suspendingWallet.current_balance || 0)}
                    </span>
                  </div>

                  {(suspendingWallet.current_balance || 0) > 0 ? (
                    <p className="mt-2 text-xs text-amber-300/90 leading-relaxed border-t border-white/5 pt-2">
                      ⚠️ In accordance with strict double-entry ledger rules, this balance cannot be deleted or orphaned.
                      It will be atomically swept into your chosen destination account before suspending.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400 border-t border-white/5 pt-2">
                      This account has zero balance. Suspending will immediately hide it from Quick Log and disable future transactions.
                    </p>
                  )}
                </div>

                {/* Destination Wallet Selector (Mandatory if balance > 0) */}
                {(suspendingWallet.current_balance || 0) > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-violet-400" />
                      Transfer remaining balance to: <span className="text-rose-400">*</span>
                    </label>

                    {activeWallets.filter((w) => w.id !== suspendingWallet.id).length === 0 ? (
                      <div className="mt-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                        You have no other active accounts to receive the remaining {formatINR(suspendingWallet.current_balance || 0)}.
                        Please create another active wallet before closing this one.
                      </div>
                    ) : (
                      <select
                        required
                        value={sweepTargetWalletId}
                        onChange={(e) => setSweepTargetWalletId(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                      >
                        {activeWallets
                          .filter((w) => w.id !== suspendingWallet.id)
                          .map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.account_type} • Balance: {formatINR(w.current_balance || 0)})
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Optional Sweep Notes */}
                {(suspendingWallet.current_balance || 0) > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Transfer Note (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Account closure sweep / Changed primary bank"
                      value={sweepNotes}
                      onChange={(e) => setSweepNotes(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Live Sweep Transaction Preview */}
                {(suspendingWallet.current_balance || 0) > 0 && sweepTargetWalletId && (
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3.5 text-xs space-y-1.5">
                    <div className="font-semibold text-violet-300">Atomic Transaction Blueprint:</div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>1. Debit {suspendingWallet.name}</span>
                      <span className="font-mono text-rose-400">-{formatINR(suspendingWallet.current_balance || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>2. Credit Destination Account</span>
                      <span className="font-mono text-emerald-400">+{formatINR(suspendingWallet.current_balance || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-white/5">
                      <span>3. Final {suspendingWallet.name} Status</span>
                      <span className="font-mono font-bold text-amber-400">SUSPENDED (₹0.00)</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSuspendingWallet(null)}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      ((suspendingWallet.current_balance || 0) > 0 &&
                        activeWallets.filter((w) => w.id !== suspendingWallet.id).length === 0)
                    }
                    className="rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4" />
                        <span>Confirm &amp; Suspend Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
