'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Wallet,
  Sliders,
  Repeat,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Plus,
} from 'lucide-react';
import AddWalletModal from '../wallets/AddWalletModal';
import BudgetSetupModal from '../budgets/BudgetSetupModal';
import { Category } from '@/lib/types';

interface InitialSetupCardProps {
  walletCount: number;
  hasBudget: boolean;
  categories: Category[];
}

export default function InitialSetupCard({
  walletCount,
  hasBudget,
  categories,
}: InitialSetupCardProps) {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // If user already has both wallets and budgets, they can still view or it auto-minimizes
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed && walletCount > 0 && hasBudget) return null;

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 via-[#0F172A] to-indigo-950/40 p-6 shadow-xl relative overflow-hidden">
      <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Financial Foundation Setup</span>
              <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[10px] font-mono text-violet-300">
                Guided
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Configure your real wallets, monthly category caps, and recurring cadences
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          {walletCount > 0 && hasBudget ? 'Dismiss' : ''}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Step 1: Wallets */}
        <button
          onClick={() => setIsWalletModalOpen(true)}
          className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all group ${
            walletCount > 0
              ? 'border-emerald-500/30 bg-emerald-950/15'
              : 'border-violet-500/30 bg-[#090D16]/80 hover:border-violet-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
              <Wallet className="h-4 w-4" />
            </div>
            {walletCount > 0 ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {walletCount} Active
              </span>
            ) : (
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                Step 1
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
              Add Wallets &amp; Starting Balance
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Primary Bank, UPI Pocket, or Cash in Hand
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-violet-400">
            <span>+ Add Account</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </button>

        {/* Step 2: Budgets */}
        <button
          onClick={() => setIsBudgetModalOpen(true)}
          className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all group ${
            hasBudget
              ? 'border-emerald-500/30 bg-emerald-950/15'
              : 'border-violet-500/30 bg-[#090D16]/80 hover:border-violet-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sliders className="h-4 w-4" />
            </div>
            {hasBudget ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Configured
              </span>
            ) : (
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                Step 2
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
              Allocate Category Budgets
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Monthly limits for Groceries, Outings, Tech, etc.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <span>Configure Caps</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </button>

        {/* Step 3: Sinking Funds */}
        <Link
          href="/subscriptions"
          className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#090D16]/80 p-4 text-left hover:border-violet-500/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
              <Repeat className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Step 3
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
              Sinking Funds &amp; Cadences
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              84d mobile plans, 182d Wi-Fi, work tools
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-violet-400">
            <span>Setup Sinking Funds</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </Link>

        {/* Step 4: Income Inflow */}
        <Link
          href="/income"
          className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#090D16]/80 p-4 text-left hover:border-blue-500/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Step 4
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
              Income Inflow Pipeline
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Full-time salary and active freelance contracts
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-blue-400">
            <span>Register Streams</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </Link>
      </div>

      <AddWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />

      <BudgetSetupModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        categories={categories}
      />
    </div>
  );
}
