'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import QuickLogModal from '../quick-log/QuickLogModal';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  // Global hotkey: press 'q' or 'Q' to open Quick Log (when not inside inputs and not on auth pages)
  useEffect(() => {
    if (isAuthPage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setQuickLogOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthPage]);

  // Dedicated full-screen layout for authentication pages
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-[#080C14] text-[#F8FAFC]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-[#F8FAFC]">
      <Navbar onOpenQuickLog={() => setQuickLogOpen(true)} />
      
      <main className="flex-1 pb-24 md:pb-12">
        {children}
      </main>

      <BottomNav onOpenQuickLog={() => setQuickLogOpen(true)} />

      <QuickLogModal
        isOpen={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
      />
    </div>
  );
}
