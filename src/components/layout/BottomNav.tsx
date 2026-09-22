'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ReceiptText,
  TrendingUp,
  HandCoins,
  Repeat,
  Wallet,
  Plus,
} from 'lucide-react';

interface BottomNavProps {
  onOpenQuickLog: () => void;
}

export default function BottomNav({ onOpenQuickLog }: BottomNavProps) {
  const pathname = usePathname();

  const leftItems = [
    { href: '/', label: 'Home', icon: LayoutDashboard },
    { href: '/wallets', label: 'Wallets', icon: Wallet },
  ];

  const rightItems = [
    { href: '/transactions', label: 'Ledger', icon: ReceiptText },
    { href: '/subscriptions', label: 'Sinking', icon: Repeat },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block md:hidden border-t border-white/10 bg-[#090D16]/95 backdrop-blur-xl pb-safe">
      <div className="flex h-16 items-center justify-around px-2 relative">
        {/* Left Nav Items */}
        {leftItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 w-16 transition-colors ${
                isActive ? 'text-violet-400 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* Elevated Centered Quick-Log FAB */}
        <div className="relative -top-5 flex justify-center items-center">
          <button
            onClick={onOpenQuickLog}
            aria-label="Quick Log Expense"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-xl shadow-violet-600/40 border-4 border-[#090D16] active:scale-95 transition-transform"
          >
            <Plus className="h-7 w-7 stroke-[2.5]" />
          </button>
        </div>

        {/* Right Nav Items */}
        {rightItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 w-16 transition-colors ${
                isActive ? 'text-violet-400 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
