---
name: tracker-ui-ux-design-system
description: "Visual design language, neo-fintech design tokens, dark-mode glassmorphic components, dashboard layout hierarchy, and sub-8-second mobile quick-log ergonomics for LedgerForge."
---

# Tracker UI/UX Design System Specification

This operational skill defines the visual identity, UI tokens, dashboard layout grid, chart visual grammar, and mobile interaction choreography for LedgerForge.

---

## 1. Visual Identity & Aesthetic Principles

LedgerForge utilizes a **neo-fintech dark-mode aesthetic**: hyper-crisp typography, rich depth via subtle glassmorphic elevation, soft ambient border glows, and purposeful semantic color signaling.

### 1.1 Color Tokens & Semantic Signaling

```css
:root {
  /* Canvas & Elevation */
  --bg-canvas: #090D16;          /* Deepest space slate */
  --bg-surface: #0F172A;         /* Primary card surface */
  --bg-surface-elevated: #1E293B;/* Modals, popovers, dropdowns */
  --bg-glass: rgba(15, 23, 42, 0.75);
  
  /* Borders & Accents */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-glow: rgba(99, 102, 241, 0.25);
  --border-focus: #6366F1;
  
  /* Semantic Cash-Flow Colors */
  --color-inflow: #10B981;       /* Emerald: Realized Income, Positive Delta */
  --color-inflow-muted: rgba(16, 185, 129, 0.15);
  
  --color-liquid: #8B5CF6;       /* Violet: Liquid Pool, Primary Wallet */
  --color-receivable: #06B6D4;   /* Cyan: Money Lent / Udhaar, Unsettled Assets */
  --color-pipeline: #3B82F6;     /* Blue: Anticipated Inflow / Invoiced */
  
  --color-burn-safe: #10B981;    /* Emerald: Pacing <= 1.0 */
  --color-burn-warn: #F59E0B;    /* Amber: Pacing 1.0 - 1.15 */
  --color-burn-danger: #F43F5E;  /* Crimson: Pacing > 1.15, Impulses */
  --color-impulse-glow: rgba(244, 63, 94, 0.2);
}
```

### 1.2 Typography & Numerical Formatting
- **Font Family**: Geist Sans, Inter, or system sans-serif.
- **Financial Numbers**: `font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; font-mono`.
- Currency formatting must always render with standard Indian Rupee notation:
  - Format: `₹1,24,500.00` (Lakh/Crore grouping using `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`).

---

## 2. Dashboard Architecture & Information Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│ NAVBAR: [LedgerForge Logo]  [Quick Log FAB]  [Period: Month ▼] [Avatar]│
├────────────────────────────────────────────────────────────────────────┤
│ HERO STRIP (4-Column Responsive Grid)                                  │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│ │ Liquid Cash  │ │ MTD Burn Pacing│ │ Active Udhaar│ │ Pipeline Cash│   │
│ │ ₹1,42,850.00 │ │ ₹38,200/50,000│ │ ₹18,500.00   │ │ ₹75,000.00   │   │
│ │ (Realized)   │ │ (76.4% on track)│ │ (3 Pending) │ │ (2 Invoices) │   │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│ CHARTS & ANALYTICS ROW                                                 │
│ ┌──────────────────────────────────────┐ ┌───────────────────────────┐ │
│ │ BURN RATE VELOCITY (Area Chart)      │ │ CATEGORY SPLIT & IMPULSE  │ │
│ │ Cumulative Spend vs Target Slope     │ │ Donut with Impulse Drain %│ │
│ └──────────────────────────────────────┘ └───────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ OPERATIONAL DRILL-DOWN ROW                                             │
│ ┌──────────────────────────────────────┐ ┌───────────────────────────┐ │
│ │ UPCOMING FIXED OUTFLOWS (Timeline)   │ │ LENT MONEY (UDHAAR) KANBAN│ │
│ │ 84-day Recharge, Wi-Fi, Subscriptions│ │ Counterparty & 1-Click Pay│ │
│ └──────────────────────────────────────┘ └───────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The Hero Metric Strip (Desktop: `grid-cols-4`, Mobile: `grid-cols-1 md:grid-cols-2`)
1. **Liquid Balance Card**:
   - Hero metric in large tabular font.
   - Micro-badge: Realized money across liquid wallets.
   - Glow accent: Subtle Violet (`#8B5CF6`).
2. **MTD Burn vs Prorated Budget**:
   - Compares actual spend against linear day-of-month budget line.
   - Progress bar with dynamic color transitions (Green $\to$ Amber $\to$ Crimson).
3. **Active Lent Money (Udhaar)**:
   - Sum of outstanding receivables.
   - Counterparty avatars and count of pending loans.
   - Glow accent: Cyan (`#06B6D4`).
4. **Pipeline Inflow**:
   - Unreceived salaries + unpaid freelance invoices.
   - Distinctly labeled `Unsettled / Expected` to preserve mental accounting integrity.

### 2.2 Recharts / Tremor Visual Grammar
- **Burn Rate Velocity Chart**:
  - Recharts `ResponsiveContainer` with `AreaChart`.
  - Baseline linear reference line for perfect pacing.
  - Actual spend filled with gradient (`url(#burnGradient)`).
- **Category Donut with Impulse Ring**:
  - Main donut displays category breakdown (Food, Rent, Tech, etc.).
  - Central callout displays **Impulse Drain %** (e.g. `12.4% Impulse Drain`).

---

## 3. Sub-8-Second Mobile Quick-Log Ergonomics

Mobile logging must eliminate all unnecessary friction. A user waiting in line at a coffee shop or scanning a UPI QR code must be able to log an expense in **under 8 seconds**.

### 3.1 Mobile Layout Components
- **Sticky Bottom Navigation**: Includes a centered, elevated `[+ Quick Log]` Floating Action Button with pulsing neon ring.
- **Bottom Sheet Modal**: Slides up instantly using Framer Motion spring physics.

### 3.2 The 4-Field Minimalist Entry Flow

```
┌────────────────────────────────────────┐
│               QUICK LOG                │
│                                        │
│             ₹ [ 450 ]                  │  <- 1. Big Numeric Input
│                                        │
│ [Food] [Brews] [Tech] [Travel] [Bills] │  <- 2. 1-Tap Category Pills
│                                        │
│  Intent:  (●) Planned   (○) Impulse    │  <- 3. Intent Toggle
│                                        │
│  Type:    (●) Self Paid (○) Lent Money │  <- 4. Loan Switch
│                                        │
│ ┌────────────────────────────────────┐ │
│ │        LOG TRANSACTION (⏎)        │ │  <- Instant Save
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

1. **Big Numeric Keypad Input**: Auto-focused upon sheet open. Formatted as `₹ Amount`.
2. **Quick Category Pills**: Horizontal scroll or 5 top-frequented category buttons (`Food`, `Groceries`, `Transport`, `Social`, `Bills`).
3. **Intent Switch**: Single-tap switch between `Planned` and `Impulse` (activates impulse drain calculation).
4. **Mode Switch**: Single-tap toggle between `Paid Myself` and `Lent to Someone` (which prompts for counterparty name).

---

## 4. Component Token Standards

- Glass Card Class:
  ```css
  .ledger-card {
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1rem;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
    transition: border-color 0.2s ease, transform 0.2s ease;
  }
  .ledger-card:hover {
    border-color: rgba(99, 102, 241, 0.3);
  }
  ```
- Tabular Numbers Class:
  ```css
  .tabular-num {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
  }
  ```
