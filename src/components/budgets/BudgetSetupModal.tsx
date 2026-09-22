'use client';

import { useState } from 'react';
import { Category } from '@/lib/types';
import { batchUpsertBudgets } from '@/lib/actions';
import { X, Sliders, Check } from 'lucide-react';

interface BudgetSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export default function BudgetSetupModal({
  isOpen,
  onClose,
  categories,
}: BudgetSetupModalProps) {
  // Only parent categories (where parent_id is null)
  const parentCategories = categories.filter((c) => !c.parent_id);

  const [budgetValues, setBudgetValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAmountChange = (catId: string, val: string) => {
    setBudgetValues((prev) => ({ ...prev, [catId]: val }));
  };

  const handlePreset = (catId: string, amount: number) => {
    setBudgetValues((prev) => ({ ...prev, [catId]: amount.toString() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const items = Object.entries(budgetValues)
        .map(([categoryId, amtStr]) => ({
          categoryId,
          amount: parseFloat(amtStr) || 0,
          basePeriod: 'MONTHLY',
        }))
        .filter((item) => item.amount > 0);

      if (items.length === 0) {
        setErrorMsg('Please specify at least one category budget amount');
        setIsSubmitting(false);
        return;
      }

      await batchUpsertBudgets(items);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save budgets');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-400" />
              <span>Configure Monthly Category Budgets</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Set spending limits to calibrate dynamic MTD pacing velocity
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-3">
            {parentCategories.map((cat) => {
              const currentVal = budgetValues[cat.id] || '';
              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-white/5 bg-[#090D16] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat.color || '#8B5CF6' }}
                      />
                      {cat.name}
                    </span>
                    <span className="text-[11px] text-slate-500">Monthly</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center rounded-lg border border-white/10 bg-[#0F172A] px-3 py-1.5">
                      <span className="text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={currentVal}
                        onChange={(e) => handleAmountChange(cat.id, e.target.value)}
                        className="w-full bg-transparent pl-2 text-xs font-bold text-white tabular-num outline-none"
                      />
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1">
                      {[5000, 10000, 20000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handlePreset(cat.id, amt)}
                          className="rounded-md border border-white/5 bg-white/5 px-2 py-1 text-[10px] font-mono text-slate-400 hover:text-white"
                        >
                          {amt >= 1000 ? `${amt / 1000}k` : amt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Save Category Budgets</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
