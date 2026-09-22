---
name: coding-and-error-prevention-rules
description: "Strict full-stack guardrails, validation schemas, currency precision rules, server-authoritative state invariants, and Next.js App Router conventions for LedgerForge."
---

# Coding & Error Prevention Rules for LedgerForge

This operational skill enforces strict engineering standards to eliminate financial hallucination, floating-point drift, date miscalculations, and client-state desynchronization.

---

## 1. Cardinal Engineering Rules

### Rule 1: Never Calculate Balances in Client-Side State
- **Violation**: Calculating current liquid balance by mapping and reducing an incomplete or filtered slice of transactions in a React `useState` or `useMemo`.
- **Mandate**: All financial balances (Liquid Balance, Total Lent, Pipeline Inflow, Category MTD Burn) **MUST** originate from server-authoritative SQL aggregate queries. Client components receive calculated values from Server Components or Server Actions.

### Rule 2: Never Assume Months Have 30 Days
- **Violation**: `nextDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)` or dividing annual budgets by 30 to get daily rates.
- **Mandate**: Use `date-fns` for all cadence arithmetic:
  - Exact days in month: `getDaysInMonth(currentDate)`
  - Exact interval addition: `addDays(lastBilledDate, intervalDays)`
  - Days remaining: `differenceInCalendarDays(nextDueDate, new Date())`

### Rule 3: Zero Floating-Point Currency Drift
- **Violation**: `let total = 0.1 + 0.2; // 0.30000000000000004`
- **Mandate**:
  - In PostgreSQL: Store as `NUMERIC(12, 2)`.
  - In TypeScript: Either handle monetary values in integer paise/cents (`amountInPaise = Math.round(amount * 100)`), or use decimal math libraries (`dinero.js` or `decimal.js`).
  - When parsing user input: Format with two decimal places using explicit rounding: `Math.round(val * 100) / 100`.

### Rule 4: Validate Every Payload with Zod Before Database Access
- **Mandate**: Every Server Action and API route must parse incoming payloads through strict Zod schemas before touching Neon PostgreSQL.

---

## 2. Zod Validation Schemas

```typescript
import { z } from 'zod';

export const TransactionInputSchema = z.object({
  walletId: z.string().uuid({ message: 'Valid wallet ID required' }),
  categoryId: z.string().uuid().optional().nullable(),
  type: z.enum(['EXPENSE', 'INCOME', 'LENT', 'DEBT_REPAYMENT', 'TRANSFER']),
  amount: z.number().positive({ message: 'Amount must be greater than zero' }).max(100000000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
  intent: z.enum(['NECESSITY', 'INVESTMENT', 'DISCRETIONARY', 'IMPULSE']).default('NECESSITY'),
  notes: z.string().max(500).optional().nullable(),
  debtCounterparty: z.string().min(1).max(128).optional(), // Required if type is 'LENT'
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const QuickLogSchema = z.object({
  amount: z.number().positive(),
  categoryId: z.string().uuid(),
  walletId: z.string().uuid(),
  intent: z.enum(['NECESSITY', 'INVESTMENT', 'DISCRETIONARY', 'IMPULSE']),
  type: z.enum(['EXPENSE', 'LENT']),
  counterpartyName: z.string().optional(),
});

export const SubscriptionInputSchema = z.object({
  walletId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(128),
  billingAmount: z.number().positive(),
  cadenceUnit: z.enum(['DAYS', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']),
  intervalDays: z.number().int().positive(),
  lastBilledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

---

## 3. Next.js App Router Architecture & State Boundaries

### 3.1 Server Components vs. Client Components
- **Server Components (Default)**:
  - Fetch authoritative ledger data directly from Neon PostgreSQL using `@neondatabase/serverless`.
  - Perform financial calculations (Liquid Balance, Pacing Ratios, Runway Countdowns) on the server.
  - Pass read-only serialized data to Client Components.
- **Client Components (`'use client'`)**:
  - Reserved exclusively for interactive elements: Quick Log bottom sheet, dynamic chart tooltips, dropdowns, and optimistic UI updates.

### 3.2 Cache Revalidation Pattern
Whenever a transaction, debt payment, or subscription is mutated:
```typescript
'use server';

import { revalidatePath } from 'next/cache';

export async function createTransaction(formData: unknown) {
  const validated = TransactionInputSchema.parse(formData);
  
  // Execute database insert inside Neon transaction
  // ...
  
  // Instantly bust cached metrics
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  revalidatePath('/debts');
}
```

---

## 4. UI Grid & Responsiveness Enforcements

- Dashboard grids must adhere to standard responsive breakpoints without custom arbitrary fractions:
  - Hero Metric Strip: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4`
  - Analytics Section: `grid grid-cols-1 lg:grid-cols-3 gap-6` (e.g., 2 cols for Area Chart, 1 col for Donut)
  - Operations Section: `grid grid-cols-1 lg:grid-cols-2 gap-6`
- Mobile touch targets must have a minimum size of `44px x 44px`.
- High contrast: Text colors must meet WCAG AAA standards on dark surfaces (`#94A3B8` for secondary text, `#F8FAFC` for primary numbers and headings).
