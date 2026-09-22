'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Flame,
  LayoutDashboard,
  ReceiptText,
  TrendingUp,
  HandCoins,
  Repeat,
  Wallet,
  Plus,
  LogOut,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';

interface NavbarProps {
  onOpenQuickLog?: () => void;
}

export default function Navbar({ onOpenQuickLog }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/wallets', label: 'Wallets', icon: Wallet },
    { href: '/transactions', label: 'Ledger', icon: ReceiptText },
    { href: '/income', label: 'Pipeline', icon: TrendingUp },
    { href: '/debts', label: 'Udhaar', icon: HandCoins },
    { href: '/subscriptions', label: 'Sinking Funds', icon: Repeat },
  ];

  // Close dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push('/login');
            router.refresh();
          },
        },
      });
    } catch (err) {
      console.error('Sign out error:', err);
      router.push('/login');
    }
  };

  const [imageError, setImageError] = useState(false);

  const userName = session?.user?.name || 'Authorized User';
  const userEmail = session?.user?.email || '';
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'LF';

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090D16]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Compact Logo Mark + Nav Links */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          <Link href="/" className="flex items-center group shrink-0" title="LedgerForge Home">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-emerald-400 p-0.5 shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
              <div className="flex h-full w-full items-center justify-center rounded-[9px] bg-[#090D16]">
                <Flame className="h-4.5 w-4.5 text-violet-400 group-hover:text-emerald-400 transition-colors" />
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg px-2.5 lg:px-3 py-1.5 text-xs lg:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-sm shadow-violet-500/10'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick Log Action (Desktop & Mobile) */}
          {onOpenQuickLog && (
            <button
              onClick={onOpenQuickLog}
              className="group relative inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-600/90 to-indigo-600/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-violet-600/20 hover:from-violet-500 hover:to-indigo-500 hover:border-violet-400/50 hover:shadow-violet-500/30 active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3] group-hover:rotate-90 transition-transform duration-200" />
              <span className="hidden sm:inline">Quick Log</span>
              <kbd className="hidden sm:inline-block rounded-md border border-white/20 bg-black/30 px-1.5 py-0.5 text-[10px] font-mono text-violet-200">
                Q
              </kbd>
            </button>
          )}

          {/* Dynamic User Profile Avatar & Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="User account menu"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0F172A] p-1 pr-2.5 text-xs font-semibold text-slate-300 hover:border-violet-500/40 hover:bg-white/5 transition-all"
            >
              {session?.user?.image && !imageError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={userName}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="h-7 w-7 rounded-lg object-cover ring-1 ring-violet-500/40"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 text-white text-[11px] font-bold tracking-tight shadow-inner ring-1 ring-white/15">
                  {initials}
                </div>
              )}
              <span className="hidden lg:inline max-w-[110px] truncate text-slate-200">
                {userName.split(' ')[0]}
              </span>
              <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-white/10 bg-[#0F172A]/95 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="text-xs font-semibold text-white truncate">{userName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
