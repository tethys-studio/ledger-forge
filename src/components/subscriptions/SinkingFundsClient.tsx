'use client';

import { useState } from 'react';
import { SubscriptionRecurring, AccountWallet, Category } from '@/lib/types';
import { formatINR } from '@/lib/formatters';
import { createSubscription, renewSubscription, suspendSubscription, reactivateSubscription } from '@/lib/actions';
import { testTelegramDispatcher } from '@/lib/telegram';
import {
  Repeat,
  Calendar,
  Clock,
  Send,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Copy,
  ExternalLink,
  Smartphone,
  Wifi,
  Sparkles,
  X,
  Check,
  ChevronDown,
  Layers,
  CalendarClock,
  Settings2,
  Edit3,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  PowerOff,
  ShieldAlert,
} from 'lucide-react';
import { addMonths, addYears, addDays, parseISO, format, differenceInCalendarDays } from 'date-fns';

interface SinkingFundsClientProps {
  sinkingFunds: SubscriptionRecurring[];
  wallets: AccountWallet[];
  categories: Category[];
  userId?: string;
}

export default function SinkingFundsClient({
  sinkingFunds,
  wallets,
  categories,
  userId,
}: SinkingFundsClientProps) {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showTelegramConfig, setShowTelegramConfig] = useState(false);

  // Flexible Renewal Modal State
  const [renewModalFund, setRenewModalFund] = useState<SubscriptionRecurring | null>(null);
  const [renewAmount, setRenewAmount] = useState<string>('');
  const [renewDays, setRenewDays] = useState<string>('56');
  const [renewCadenceUnit, setRenewCadenceUnit] = useState<'HALF_YEARLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'DAYS'>('DAYS');
  const [renewDate, setRenewDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [renewWallet, setRenewWallet] = useState<string>('');
  const [renewSubmitting, setRenewSubmitting] = useState<boolean>(false);
  const [renewError, setRenewError] = useState<string>('');

  // Suspend Subscription Modal State
  const [suspendModalFund, setSuspendModalFund] = useState<SubscriptionRecurring | null>(null);
  const [isSuspending, setIsSuspending] = useState<boolean>(false);
  const [suspendError, setSuspendError] = useState<string>('');
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  // Add Sinking Fund Form State
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formIntervalDays, setFormIntervalDays] = useState('84');
  const [formCadenceUnit, setFormCadenceUnit] = useState<'HALF_YEARLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'DAYS'>('DAYS');
  const [formLastBilled, setFormLastBilled] = useState(() => new Date().toISOString().split('T')[0]);
  const [formWallet, setFormWallet] = useState(wallets[0]?.id || '');
  const [formCategory, setFormCategory] = useState(categories[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Telegram test inputs
  const [customToken, setCustomToken] = useState('');
  const [customChatId, setCustomChatId] = useState('');

  const activeFunds = sinkingFunds.filter((f) => f.status !== 'SUSPENDED');
  const suspendedFunds = sinkingFunds.filter((f) => f.status === 'SUSPENDED');

  // Daily Reserve Burn and Monthly Allocation only aggregate ACTIVE subscriptions
  const totalDailyReserve = activeFunds.reduce(
    (acc, f) => acc + (f.daily_amortized_burn || 0),
    0
  );
  const totalMonthlyAllocation = totalDailyReserve * 30;

  const openRenewModal = (fund: SubscriptionRecurring) => {
    setRenewModalFund(fund);
    setRenewAmount(String(fund.billing_amount));
    setRenewDays(String(fund.interval_days || 56));
    setRenewCadenceUnit((fund.cadence_unit as any) || 'DAYS');
    setRenewDate(format(new Date(), 'yyyy-MM-dd'));
    setRenewWallet(fund.wallet_id || wallets[0]?.id || '');
    setRenewError('');
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewModalFund) return;
    setRenewError('');

    const amt = parseFloat(renewAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setRenewError('Please enter a valid renewal amount (e.g. 559)');
      return;
    }

    const days = parseInt(renewDays, 10);
    if (renewCadenceUnit === 'DAYS' && (!days || days <= 0)) {
      setRenewError('Please enter the number of validity days (e.g. 56)');
      return;
    }

    setRenewSubmitting(true);
    try {
      await renewSubscription({
        subscriptionId: renewModalFund.id,
        amount: amt,
        intervalDays: renewCadenceUnit === 'DAYS' ? days : undefined,
        cadenceUnit: renewCadenceUnit,
        renewalDate: renewDate,
        walletId: renewWallet || null,
      });

      setRenewModalFund(null);
    } catch (err) {
      setRenewError(err instanceof Error ? err.message : 'Failed to process renewal');
    } finally {
      setRenewSubmitting(false);
    }
  };

  const handleOpenSuspendModal = (fund: SubscriptionRecurring) => {
    setSuspendModalFund(fund);
    setSuspendError('');
  };

  const handleSuspendConfirm = async () => {
    if (!suspendModalFund) return;
    setIsSuspending(true);
    setSuspendError('');
    try {
      await suspendSubscription(suspendModalFund.id);
      setSuspendModalFund(null);
    } catch (err) {
      setSuspendError(err instanceof Error ? err.message : 'Failed to suspend subscription');
    } finally {
      setIsSuspending(false);
    }
  };

  const handleReactivate = async (fundId: string) => {
    setReactivatingId(fundId);
    try {
      await reactivateSubscription(fundId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reactivate subscription');
    } finally {
      setReactivatingId(null);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTestStatus(null);
    try {
      const result = await testTelegramDispatcher(
        customToken.trim() || undefined,
        customChatId.trim() || undefined
      );
      if (result.success) {
        setTestStatus('✅ Telegram alert dispatched successfully to your phone!');
      } else {
        setTestStatus(`⚠️ ${result.message}`);
      }
    } catch (err) {
      setTestStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleCopyICalLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/api/calendar/renewals.ics${userId ? `?u=${userId}` : ''}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Live calculation for Add Modal
  const getLiveCalculations = () => {
    const amt = parseFloat(formAmount) || 0;
    const customDays = parseInt(formIntervalDays, 10) || 30;
    if (!formLastBilled) {
      return { nextDue: '—', dailyBurn: 0, monthlyBurn: 0, daysInCycle: customDays, isMonthBased: false, months: 1 };
    }

    try {
      const lastDate = parseISO(formLastBilled);
      let nextDate: Date;
      let isMonthBased = false;
      let months = 1;

      if (formCadenceUnit === 'HALF_YEARLY') {
        nextDate = addMonths(lastDate, 6);
        isMonthBased = true;
        months = 6;
      } else if (formCadenceUnit === 'MONTHLY') {
        nextDate = addMonths(lastDate, 1);
        isMonthBased = true;
        months = 1;
      } else if (formCadenceUnit === 'QUARTERLY') {
        nextDate = addMonths(lastDate, 3);
        isMonthBased = true;
        months = 3;
      } else if (formCadenceUnit === 'YEARLY') {
        nextDate = addYears(lastDate, 1);
        isMonthBased = true;
        months = 12;
      } else {
        nextDate = addDays(lastDate, customDays);
        isMonthBased = false;
      }

      const totalDays = isMonthBased ? differenceInCalendarDays(nextDate, lastDate) : customDays;
      const dailyBurn = totalDays > 0 ? amt / totalDays : 0;
      const monthlyBurn = dailyBurn * 30;

      return {
        nextDue: format(nextDate, 'yyyy-MM-dd'),
        dailyBurn,
        monthlyBurn,
        daysInCycle: totalDays,
        isMonthBased,
        months,
      };
    } catch {
      return { nextDue: '—', dailyBurn: 0, monthlyBurn: 0, daysInCycle: customDays, isMonthBased: false, months: 1 };
    }
  };

  // Live calculation for Renewal Modal
  const getRenewCalculations = () => {
    const amt = parseFloat(renewAmount) || 0;
    const customDays = parseInt(renewDays, 10) || 56;
    if (!renewDate) {
      return { nextDue: '—', dailyBurn: 0, monthlyBurn: 0, daysInCycle: customDays };
    }

    try {
      const paymentDate = parseISO(renewDate);
      let nextDate: Date;
      let totalDays = customDays;

      if (renewCadenceUnit === 'HALF_YEARLY') {
        nextDate = addMonths(paymentDate, 6);
        totalDays = differenceInCalendarDays(nextDate, paymentDate);
      } else if (renewCadenceUnit === 'MONTHLY') {
        nextDate = addMonths(paymentDate, 1);
        totalDays = differenceInCalendarDays(nextDate, paymentDate);
      } else if (renewCadenceUnit === 'QUARTERLY') {
        nextDate = addMonths(paymentDate, 3);
        totalDays = differenceInCalendarDays(nextDate, paymentDate);
      } else if (renewCadenceUnit === 'YEARLY') {
        nextDate = addYears(paymentDate, 1);
        totalDays = differenceInCalendarDays(nextDate, paymentDate);
      } else {
        nextDate = addDays(paymentDate, customDays);
      }

      const dailyBurn = totalDays > 0 ? amt / totalDays : 0;
      const monthlyBurn = dailyBurn * 30;

      return {
        nextDue: format(nextDate, 'yyyy-MM-dd'),
        dailyBurn,
        monthlyBurn,
        daysInCycle: totalDays,
      };
    } catch {
      return { nextDue: '—', dailyBurn: 0, monthlyBurn: 0, daysInCycle: customDays };
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amt = parseFloat(formAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid billing amount');
      return;
    }

    const customDays = parseInt(formIntervalDays, 10);
    if (formCadenceUnit === 'DAYS' && (!customDays || customDays <= 0)) {
      setErrorMsg('Please enter a valid cycle interval in days');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSubscription({
        name: formName.trim(),
        billingAmount: amt,
        cadenceUnit: formCadenceUnit,
        intervalDays: formCadenceUnit === 'DAYS' ? customDays : undefined,
        lastBilledDate: formLastBilled,
        walletId: formWallet || null,
        categoryId: formCategory || null,
      });

      setIsAddModalOpen(false);
      setFormName('');
      setFormAmount('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create sinking fund');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyPreset = (preset: {
    name: string;
    amount: number;
    days: number;
    unit: 'HALF_YEARLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'DAYS';
    catKeywords: string[];
  }) => {
    setFormName(preset.name);
    setFormAmount(preset.amount.toString());
    setFormIntervalDays(preset.days.toString());
    setFormCadenceUnit(preset.unit);
    const matched = categories.find((c) =>
      preset.catKeywords.some((k) => c.name.toLowerCase().includes(k))
    );
    if (matched) setFormCategory(matched.id);
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Amortization Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#0F172A] via-[#0D1424] to-violet-950/20 p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-6 -mr-6 h-36 w-36 rounded-full bg-violet-600/10 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Daily Sinking Reserve Target
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tabular-nums tracking-tight">
              {formatINR(totalDailyReserve)}
              <span className="text-sm font-semibold text-violet-300 ml-1">/day</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              True 24-hour reserve provision required across all {sinkingFunds.length} irregular cycles
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#0F172A] via-[#0D1424] to-emerald-950/20 p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-6 -mr-6 h-36 w-36 rounded-full bg-emerald-600/10 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Monthly Reserve Provision
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tabular-nums tracking-tight">
              ~{formatINR(totalMonthlyAllocation)}
              <span className="text-sm font-semibold text-emerald-300 ml-1">/mo</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Prorated monthly sinking-fund provision to buffer lumpsum renewal hits
            </p>
          </div>
        </div>
      </div>

      {/* 2. Sinking Funds List & Operations */}
      <div className="rounded-2xl border border-white/10 bg-[#0D1424] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-violet-400" />
                Recurring Cadences &amp; Subscriptions
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Telecom recharges, SaaS tools, and multi-month bills with active budget allocation and smart alarms
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Active vs Suspended Tab Segment */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090D16] border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'ACTIVE'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Active</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    activeTab === 'ACTIVE' ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {activeFunds.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SUSPENDED')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'SUSPENDED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PauseCircle className="h-3.5 w-3.5 text-amber-400" />
                <span>Suspended</span>
                {suspendedFunds.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/30 text-amber-200">
                    {suspendedFunds.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-violet-600/20 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Add Plan</span>
            </button>
          </div>
        </div>

        {/* Tab 1: ACTIVE SUBSCRIPTIONS */}
        {activeTab === 'ACTIVE' && (
          <>
            {activeFunds.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#090D16] p-8 sm:p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-400 border border-violet-500/20 mb-3">
                  <Repeat className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold text-white">No Active Sinking Funds</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Prevent cash spikes by amortizing non-monthly bills (telecom recharges, Wi-Fi plans, and SaaS tools) into smooth daily allocations.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
                  {[
                    { label: '📱 Telecom Recharge (Flexible)', name: 'Mobile Telecom Recharge', amount: 559, days: 56, unit: 'DAYS' as const, catKeywords: ['telecom', 'mobile'] },
                    { label: '🌐 6-Month Fibernet (₹3,000)', name: 'Fibernet Broadband (6 Months)', amount: 3000, days: 184, unit: 'HALF_YEARLY' as const, catKeywords: ['fiber', 'utilit'] },
                    { label: '🤖 Creative / AI Cloud (₹1,950)', name: 'Cloud Tools & AI Subscription', amount: 1950, days: 30, unit: 'MONTHLY' as const, catKeywords: ['software', 'tech'] },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="rounded-xl border border-violet-500/30 bg-violet-600/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/20 hover:border-violet-500/50 active:scale-95 transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Custom Sinking Fund</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeFunds.map((fund) => {
                  const days = fund.days_remaining ?? 0;
                  const isUrgent = days <= 3;
                  const isRoutine = days <= 7 && days > 3;

                  return (
                    <div
                      key={fund.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/5 bg-[#090D16] p-4 hover:border-violet-500/30 transition-all group"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 group-hover:scale-105 transition-transform">
                          <Repeat className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white tracking-tight truncate">{fund.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                            <span className="text-white font-extrabold font-mono">
                              {formatINR(fund.billing_amount)}
                            </span>
                            <span>•</span>
                            <span className="text-emerald-400 font-mono font-semibold">
                              {formatINR(fund.daily_amortized_burn || 0)}/day
                            </span>
                            <span>•</span>
                            <span className="text-slate-300 font-medium">
                              {fund.cadence_unit === 'HALF_YEARLY'
                                ? 'Every 6 Months'
                                : fund.cadence_unit === 'MONTHLY'
                                ? 'Every Month'
                                : fund.cadence_unit === 'QUARTERLY'
                                ? 'Every 3 Months'
                                : fund.cadence_unit === 'YEARLY'
                                ? 'Every Year'
                                : `Every ${fund.interval_days} days`}
                            </span>
                            <span>•</span>
                            <span className="text-slate-500">Last billed: {fund.last_billed_date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0 flex-wrap">
                        <div className="text-right mr-1">
                          <div
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-mono font-bold ${
                              isUrgent
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse'
                                : isRoutine
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            <span>{days <= 0 ? 'Due Today' : `${days}d left`}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Due: {fund.next_due_date}
                          </div>
                        </div>

                        {/* Renew / Adjust Plan Button */}
                        <button
                          onClick={() => openRenewModal(fund)}
                          className="flex items-center gap-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 px-3 py-1.5 text-xs font-semibold active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Renew / Adjust</span>
                        </button>

                        {/* Suspend Subscription Button */}
                        <button
                          onClick={() => handleOpenSuspendModal(fund)}
                          title="Suspend this subscription and pause reserve burn & alarms"
                          className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 px-3 py-1.5 text-xs font-semibold active:scale-95 transition-all"
                        >
                          <PauseCircle className="h-3.5 w-3.5 text-amber-400" />
                          <span>Suspend</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab 2: SUSPENDED SUBSCRIPTIONS */}
        {activeTab === 'SUSPENDED' && (
          <>
            {suspendedFunds.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#090D16] p-8 sm:p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <h4 className="text-base font-bold text-white">No Suspended Subscriptions</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  All your recurring services are currently active. If you pause or cancel a tool (like Adobe Creative Cloud), suspend it here to immediately freeze its daily reserve target and silence Google Calendar and Telegram renewal alarms.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-300/90 flex items-center justify-between">
                  <span>
                    Suspended subscriptions do not consume daily budget reserves and have all calendar/Telegram alarms turned off.
                  </span>
                  <span className="font-mono text-[11px] font-bold text-amber-400">
                    {suspendedFunds.length} paused
                  </span>
                </div>

                {suspendedFunds.map((fund) => {
                  return (
                    <div
                      key={fund.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-dashed border-amber-500/25 bg-[#090D16]/90 p-4 transition-all group"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <PauseCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-200 tracking-tight truncate">
                              {fund.name}
                            </h4>
                            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1">
                              <PauseCircle className="h-3 w-3" />
                              SUSPENDED
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                            <span className="text-slate-300 font-extrabold font-mono">
                              {formatINR(fund.billing_amount)}
                            </span>
                            <span>•</span>
                            <span className="text-slate-400 font-medium">
                              {fund.cadence_unit === 'HALF_YEARLY'
                                ? 'Every 6 Months'
                                : fund.cadence_unit === 'MONTHLY'
                                ? 'Every Month'
                                : fund.cadence_unit === 'QUARTERLY'
                                ? 'Every 3 Months'
                                : fund.cadence_unit === 'YEARLY'
                                ? 'Every Year'
                                : `Every ${fund.interval_days} days`}
                            </span>
                            <span>•</span>
                            <span className="text-amber-400/90 font-mono text-[11px]">
                              Alarms &amp; daily reserve paused
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0 flex-wrap">
                        {/* Resume / Reactivate Button */}
                        <button
                          onClick={() => handleReactivate(fund.id)}
                          disabled={reactivatingId === fund.id}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-semibold active:scale-95 disabled:opacity-50 transition-all"
                        >
                          {reactivatingId === fund.id ? (
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                          ) : (
                            <PlayCircle className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                          <span>Resume Plan</span>
                        </button>

                        {/* Renew & Reactivate Plan Button */}
                        <button
                          onClick={() => openRenewModal(fund)}
                          className="flex items-center gap-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 px-3 py-1.5 text-xs font-semibold active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
                          <span>Renew &amp; Resume</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. Zero-Cost Smart Alert Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dynamic Native Calendar Integration (RFC 5545 iCalendar) */}
        <div className="rounded-2xl border border-white/10 bg-[#0D1424] p-5 sm:p-6 space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Smartphone Calendar Sync</h3>
                <p className="text-[11px] text-slate-400">Dynamic RFC 5545 iCalendar (.ics)</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
              Live
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Subscribe once in <strong>Apple Calendar</strong>, <strong>Google Calendar</strong>, or <strong>Outlook</strong>. Smart alarms chime automatically at <strong>7 days</strong>, <strong>3 days</strong>, and <strong>1 day</strong> prior to renewal.
          </p>

          <div className="rounded-xl border border-white/10 bg-[#090D16] p-2.5 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-mono text-emerald-400 text-[11px]">
              /api/calendar/renewals.ics{userId ? `?u=${userId.slice(0, 8)}...` : ''}
            </span>
            <button
              onClick={handleCopyICalLink}
              className="flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors shrink-0"
            >
              {copiedLink ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedLink ? 'Copied URL!' : 'Copy Link'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={`/api/calendar/renewals.ics${userId ? `?u=${userId}` : ''}`}
              target="_blank"
              download="renewals.ics"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 py-2 text-xs font-semibold text-emerald-300 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Download .ICS File</span>
            </a>
            <a
              href="https://calendar.google.com/calendar/r"
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-2 text-xs font-semibold text-slate-300 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Google Calendar</span>
            </a>
          </div>
        </div>

        {/* Telegram Push Dispatcher */}
        <div className="rounded-2xl border border-white/10 bg-[#0D1424] p-5 sm:p-6 space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Telegram Instant Alarms</h3>
                <p className="text-[11px] text-slate-400">Zero-cost push notification dispatcher</p>
              </div>
            </div>
            <button
              onClick={() => setShowTelegramConfig((prev) => !prev)}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400 hover:text-white"
            >
              <Settings2 className="h-3 w-3" />
              <span>Configure</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Pushes urgent priority alerts to your Telegram bot when renewals reach <strong>7-day</strong>, <strong>3-day</strong>, and <strong>24-hour</strong> horizons.
          </p>

          {showTelegramConfig && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-[10px] font-mono uppercase text-slate-400">Custom Credentials</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="TELEGRAM_BOT_TOKEN"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="TELEGRAM_CHAT_ID"
                  value={customChatId}
                  onChange={(e) => setCustomChatId(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleTestTelegram}
            disabled={isTestingTelegram}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all"
          >
            {isTestingTelegram ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send Test Alert to Smartphone</span>
              </>
            )}
          </button>

          {testStatus && (
            <div className="rounded-xl border border-white/10 bg-[#090D16] p-2.5 text-xs text-slate-300">
              {testStatus}
            </div>
          )}
        </div>
      </div>

      {/* 4. Flexible Renewal Modal (Allows modifying recharge amount & days before confirming) */}
      {renewModalFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-violet-500/30 bg-[#0F172A] p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Renew &amp; Adjust Plan</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                    {renewModalFund.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRenewModalFund(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {renewError && (
              <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300 font-medium">
                {renewError}
              </div>
            )}

            {/* Current Plan Reference Banner */}
            <div className="mt-3.5 rounded-xl border border-white/5 bg-[#090D16] p-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">Previous Cycle:</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-300 line-through">₹{parseFloat(String(renewModalFund.billing_amount)).toLocaleString('en-IN')}</span>
                <span className="text-slate-500">({renewModalFund.interval_days} days)</span>
                <span className="text-violet-400 font-bold">{formatINR(renewModalFund.daily_amortized_burn || 0)}/day</span>
              </div>
            </div>

            <form onSubmit={handleRenewSubmit} className="mt-4 space-y-4">
              {/* Recharge Amount with Indian Telecom Quick Chips */}
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  This Renewal Amount (INR)
                </label>
                <div className="mt-1.5 flex items-center rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2 focus-within:border-violet-500">
                  <span className="text-lg font-bold text-violet-400 mr-2">₹</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 559"
                    value={renewAmount}
                    onChange={(e) => setRenewAmount(e.target.value)}
                    className="w-full bg-transparent text-xl font-black text-white font-mono tabular-nums outline-none"
                    required
                  />
                </div>

                {/* Popular Telecom Recharge Presets */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    { label: '₹299 (28d)', amt: 299, days: 28 },
                    { label: '₹559 (56d)', amt: 559, days: 56 },
                    { label: '₹719 (84d)', amt: 719, days: 84 },
                    { label: '₹899 (84d)', amt: 899, days: 84 },
                    { label: '₹2,999 (365d)', amt: 2999, days: 365 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setRenewAmount(preset.amt.toString());
                        setRenewDays(preset.days.toString());
                        setRenewCadenceUnit('DAYS');
                      }}
                      className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-mono text-violet-300 hover:bg-violet-500/20 active:scale-95 transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cadence Unit & Validity Days */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Cadence Type</label>
                  <select
                    value={renewCadenceUnit}
                    onChange={(e) => setRenewCadenceUnit(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  >
                    <option value="DAYS">Fixed Days (e.g. 28d, 56d, 84d)</option>
                    <option value="MONTHLY">Monthly (1 Month)</option>
                    <option value="QUARTERLY">Quarterly (3 Months)</option>
                    <option value="HALF_YEARLY">Half-Yearly (6 Months)</option>
                    <option value="YEARLY">Annual (1 Year)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    {renewCadenceUnit === 'DAYS' ? 'Next Validity (Days)' : 'Duration'}
                  </label>
                  {renewCadenceUnit === 'DAYS' ? (
                    <input
                      type="number"
                      value={renewDays}
                      onChange={(e) => setRenewDays(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white font-mono tabular-nums outline-none focus:border-violet-500"
                      placeholder="e.g. 56"
                      required
                    />
                  ) : (
                    <div className="mt-1.5 flex items-center justify-between rounded-xl border border-white/10 bg-[#090D16]/60 px-3 py-2 text-xs text-slate-300">
                      <span className="font-semibold text-violet-300">
                        {renewCadenceUnit === 'HALF_YEARLY'
                          ? '6 Calendar Months'
                          : renewCadenceUnit === 'MONTHLY'
                          ? '1 Calendar Month'
                          : renewCadenceUnit === 'QUARTERLY'
                          ? '3 Calendar Months'
                          : '12 Calendar Months'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Day Chips if Fixed Days */}
              {renewCadenceUnit === 'DAYS' && (
                <div className="flex flex-wrap gap-1.5">
                  {[28, 56, 84, 180, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRenewDays(d.toString())}
                      className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-mono transition-all ${
                        renewDays === d.toString()
                          ? 'border-violet-500 bg-violet-600 text-white font-bold'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              )}

              {/* Payment Date & Wallet */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Recharge Date</label>
                  <input
                    type="date"
                    value={renewDate}
                    onChange={(e) => setRenewDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Paid from Account</label>
                  <select
                    value={renewWallet}
                    onChange={(e) => setRenewWallet(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  >
                    {wallets.length === 0 ? (
                      <option value="">No wallet linked (Optional)</option>
                    ) : (
                      <>
                        <option value="">Select account</option>
                        {wallets.map((w) => (
                          <option key={w.id} value={w.id} className="bg-[#0F172A]">
                            {w.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Live Preview of New Amortization Math */}
              {(() => {
                const calc = getRenewCalculations();
                const prevBurn = renewModalFund.daily_amortized_burn || 0;
                const diff = calc.dailyBurn - prevBurn;

                return (
                  <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">New Daily Reserve Rate:</span>
                      <span className="font-extrabold font-mono text-emerald-400 text-sm">
                        {formatINR(calc.dailyBurn)}/day
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Monthly Sinking Provision:</span>
                      <span className="font-bold font-mono text-violet-300">
                        ~{formatINR(calc.monthlyBurn)}/mo
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                      <span className="text-slate-400">Next Renewal Target Due:</span>
                      <span className="font-bold font-mono text-white flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-violet-400" />
                        {calc.nextDue}
                      </span>
                    </div>

                    {diff !== 0 && (
                      <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Daily Delta:</span>
                        <span className={`font-semibold flex items-center gap-0.5 ${diff < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {diff < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                          {diff < 0 ? '-' : '+'}{formatINR(Math.abs(diff))}/day
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRenewModalFund(null)}
                  className="w-1/3 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewSubmitting}
                  className="w-2/3 rounded-xl bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {renewSubmitting ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>Confirm &amp; Record (₹{parseFloat(renewAmount || '0').toLocaleString('en-IN')})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendModalFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#0F172A] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <PauseCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Suspend Subscription</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                    {suspendModalFund.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSuspendModalFund(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {suspendError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300 font-medium">
                {suspendError}
              </div>
            )}

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2.5 text-xs text-slate-300">
              <p className="font-semibold text-white">
                Suspending this plan will apply the following immediate changes:
              </p>
              <ul className="space-y-2 text-[11px] text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">⏸️</span>
                  <span>
                    <strong>Freezes Daily Reserve Burn:</strong> Removes{' '}
                    <strong className="text-white font-mono">{formatINR(suspendModalFund.daily_amortized_burn || 0)}/day</strong> from your active sinking fund runway.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">🔕</span>
                  <span>
                    <strong>Clears Smartphone Calendar Alarms:</strong> Removes renewal events from Google Calendar, Apple Calendar, and Outlook (.ics feed).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">📵</span>
                  <span>
                    <strong>Silences Telegram Push Alerts:</strong> No countdown or renewal notifications will be sent to your phone.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">🔄</span>
                  <span>
                    <strong>Resume Anytime:</strong> You can reactivate this subscription with 1 tap from the Suspended tab.
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalFund(null)}
                disabled={isSuspending}
                className="w-1/2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleSuspendConfirm}
                disabled={isSuspending}
                className="w-1/2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSuspending ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <PauseCircle className="h-4 w-4" />
                    <span>Confirm Suspend</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Sinking Fund Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Add Sinking Fund / Recharge</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300 font-medium">
                {errorMsg}
              </div>
            )}

            {/* Quick Sinking Fund Presets */}
            <div className="mt-4">
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                1-Tap Quick Presets
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[
                  { label: '📱 Mobile Recharge (Flexible)', name: 'Mobile Telecom Recharge', amount: 559, days: 56, unit: 'DAYS' as const, catKeywords: ['telecom', 'mobile'] },
                  { label: '🌐 6-Month Fibernet (₹3k)', name: 'Fibernet Broadband (6 Months)', amount: 3000, days: 184, unit: 'HALF_YEARLY' as const, catKeywords: ['fiber', 'utilit'] },
                  { label: '🤖 AI Cloud / Dev Tools (₹1.9k)', name: 'Software Subscriptions (Google AI / Claude)', amount: 1950, days: 30, unit: 'MONTHLY' as const, catKeywords: ['software', 'tech'] },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setFormName(p.name);
                      setFormAmount(p.amount.toString());
                      setFormIntervalDays(p.days.toString());
                      setFormCadenceUnit(p.unit);
                      const matched = categories.find((c) =>
                        p.catKeywords.some((k) => c.name.toLowerCase().includes(k))
                      );
                      if (matched) setFormCategory(matched.id);
                    }}
                    className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-300 hover:bg-violet-500/20 active:scale-95 transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Service / Plan Name</label>
                <input
                  type="text"
                  placeholder="e.g. Airtel Unlimited Calls, Apex Fibernet, Jio 5G"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-xs text-white outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Billing Cadence</label>
                  <select
                    value={formCadenceUnit}
                    onChange={(e) => setFormCadenceUnit(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  >
                    <option value="DAYS">Fixed Days (e.g. 28d, 56d, 84d)</option>
                    <option value="HALF_YEARLY">Half-Yearly (Exact 6 Months — Same Day)</option>
                    <option value="MONTHLY">Monthly (Exact 1 Month — Same Day)</option>
                    <option value="QUARTERLY">Quarterly (Exact 3 Months — Same Day)</option>
                    <option value="YEARLY">Annual (Exact 12 Months — Same Day)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    {formCadenceUnit === 'DAYS' ? 'Cycle Interval (Days)' : 'Cycle Duration'}
                  </label>
                  {formCadenceUnit === 'DAYS' ? (
                    <input
                      type="number"
                      value={formIntervalDays}
                      onChange={(e) => setFormIntervalDays(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white font-mono tabular-nums outline-none focus:border-violet-500"
                      placeholder="e.g. 56 or 84"
                      required
                    />
                  ) : (
                    <div className="mt-1.5 flex items-center justify-between rounded-xl border border-white/10 bg-[#090D16]/60 px-3 py-2 text-xs text-slate-300">
                      <span className="font-semibold text-violet-300">
                        {formCadenceUnit === 'HALF_YEARLY'
                          ? '6 Calendar Months'
                          : formCadenceUnit === 'MONTHLY'
                          ? '1 Calendar Month'
                          : formCadenceUnit === 'QUARTERLY'
                          ? '3 Calendar Months'
                          : '12 Calendar Months'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Same-Day Sync
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Total Outflow (INR)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="559.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3.5 py-2.5 text-base font-bold text-white font-mono tabular-nums outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Last Recharge Date</label>
                  <input
                    type="date"
                    value={formLastBilled}
                    onChange={(e) => setFormLastBilled(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none focus:border-violet-500 cursor-pointer transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Debit Account (Optional)</label>
                  <select
                    value={formWallet}
                    onChange={(e) => setFormWallet(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none"
                  >
                    {wallets.length === 0 ? (
                      <option value="">No wallet linked (Optional)</option>
                    ) : (
                      <>
                        <option value="">Select account (optional)</option>
                        {wallets.map((w) => (
                          <option key={w.id} value={w.id} className="bg-[#0F172A]">
                            {w.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090D16] px-3 py-2 text-xs text-white outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0F172A]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Live Calculation Card */}
              {(() => {
                const calc = getLiveCalculations();
                if (parseFloat(formAmount) <= 0) return null;

                return (
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-[11px] text-slate-400 font-mono">Derived Next Due Date:</span>
                      <span className="font-extrabold font-mono text-emerald-400 text-sm flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {calc.nextDue}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-[11px] text-slate-400 font-mono">Daily Reserve Target:</span>
                      <span className="font-bold font-mono text-emerald-300">{formatINR(calc.dailyBurn)}/day</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-[11px] text-slate-400 font-mono">Monthly Budget Impact:</span>
                      <span className="font-bold font-mono text-violet-300">{formatINR(calc.monthlyBurn)}/mo</span>
                    </div>
                    <div className="text-[11px] text-slate-400 border-t border-white/5 pt-1.5 flex items-center justify-between">
                      <span>Cycle Span:</span>
                      <span className="font-medium text-slate-200">
                        {calc.isMonthBased
                          ? `Exact ${calc.months} Months (${calc.daysInCycle} calendar days)`
                          : `${calc.daysInCycle} Fixed Days`}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3 text-xs font-bold text-white shadow-lg shadow-violet-600/25 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? 'Saving...' : 'Save & Calculate Amortization'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
