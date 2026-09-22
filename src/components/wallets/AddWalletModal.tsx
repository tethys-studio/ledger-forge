'use client';

import { useState } from 'react';
import { createWallet } from '@/lib/actions';
import { X, CreditCard, Building2, Smartphone, Banknote, Check } from 'lucide-react';

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddWalletModal({ isOpen, onClose }: AddWalletModalProps) {
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<'BANK' | 'UPI' | 'CASH' | 'CREDIT'>('BANK');
  const [startingBalance, setStartingBalance] = useState('');
  const [isLiquid, setIsLiquid] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter an account name');
      return;
    }

    const balance = parseFloat(startingBalance) || 0;
    if (balance < 0) {
      setErrorMsg('Starting balance cannot be negative');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await createWallet({
        name: name.trim(),
        accountType,
        isLiquid,
        startingBalance: balance,
      });

      onClose();
      setName('');
      setStartingBalance('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPreset = (presetName: string, type: 'BANK' | 'UPI' | 'CASH') => {
    setName(presetName);
    setAccountType(type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white">Add Account / Wallet</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Physical or digital place where your money lives
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Quick Presets */}
        <div className="mt-4">
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Quick Presets
          </label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[
              { label: 'Primary Bank (HDFC/ICICI)', type: 'BANK' as const },
              { label: 'UPI Pocket (GPay/PhonePe)', type: 'UPI' as const },
              { label: 'Physical Cash in Hand', type: 'CASH' as const },
              { label: 'Salary Savings Account', type: 'BANK' as const },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPreset(p.label, p.type)}
                className="rounded-lg border border-white/5 bg-[#090D16] px-2.5 py-1 text-[11px] text-slate-300 hover:border-violet-500/30 hover:text-white transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300">Account / Wallet Name</label>
            <input
              type="text"
              placeholder="e.g. Primary Bank Account, UPI GPay, Cash"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-xs text-white outline-none focus:border-violet-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300">Account Type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none"
              >
                <option value="BANK">Bank Account</option>
                <option value="UPI">UPI Pocket</option>
                <option value="CASH">Physical Cash</option>
                <option value="CREDIT">Credit Card / Line</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">Current Starting Balance</label>
              <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-[#090D16] px-3">
                <span className="text-xs font-bold text-violet-400">₹</span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  className="w-full bg-transparent py-2 pl-1.5 text-xs font-bold text-white tabular-num outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#090D16] p-3 text-xs">
            <div>
              <div className="font-semibold text-white">Liquid Cash Pool</div>
              <div className="text-[11px] text-slate-400">Include in spendable liquid asset calculations</div>
            </div>
            <input
              type="checkbox"
              checked={isLiquid}
              onChange={(e) => setIsLiquid(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 text-violet-600 focus:ring-0"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 py-3 text-xs font-bold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Save Account &amp; Initialize</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
