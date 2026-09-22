---
name: fintech-math-and-state-engine
description: "Core accounting equations, double-entry cash flow models, debt state machines, irregular recurrence normalization, and impulse drain rate calculations for LedgerForge."
---

# Fintech Math & State Engine Specification

This operational skill governs all mathematical models, ledger invariants, state machines, and periodicity conversions across LedgerForge. All frontend components, server actions, and background calculations must strictly conform to these directives.

---

## 1. Cash Accounting vs. Accrual Pipeline Tracking (Asset Integrity)

LedgerForge maintains a strict boundary between **Realized Liquidity (Cash Basis)** and **Anticipated Pipeline (Accrual Tracking)**. Users must never be led to believe expected future cash is spendable today.

### 1.1 The Liquid Balance Invariant

The Liquid Balance represents the exact sum of spendable fiat currency across all active liquid wallets (e.g., Primary Bank, UPI Pocket, Physical Cash). It only includes **settled and realized** transactions.

$$\text{Liquid Balance} = \sum(\text{Income}_{\text{received}}) - \sum(\text{Expenses}_{\text{settled}}) - \sum(\text{Lent}_{\text{active}}) + \sum(\text{Lent}_{\text{recovered}})$$

Where:
- $\text{Income}_{\text{received}}$: Sum of all transactions with type `INCOME` and status `RECEIVED`.
- $\text{Expenses}_{\text{settled}}$: Sum of all transactions with type `EXPENSE` that have cleared.
- $\text{Lent}_{\text{active}}$: Principal amounts disbursed to third parties (`transaction_type = 'LENT'`). This reduces liquid cash immediately.
- $\text{Lent}_{\text{recovered}}$: Repayments received against debts (`transaction_type = 'DEBT_REPAYMENT'`). This restores liquid cash.

#### Server-Authoritative SQL Aggregate Query:
```sql
SELECT 
  COALESCE(SUM(CASE 
    WHEN type = 'INCOME' THEN amount 
    WHEN type = 'DEBT_REPAYMENT' THEN amount 
    WHEN type = 'EXPENSE' THEN -amount 
    WHEN type = 'LENT' THEN -amount 
    ELSE 0 
  END), 0.00)::NUMERIC(12, 2) AS liquid_balance
FROM transactions
WHERE user_id = $1;
```

### 1.2 Expected Inflow (Pipeline Tracking)

Anticipated income (salaries, pending client invoices, freelance milestones) must exist in an independent pipeline state space.

- **Pipeline States**: `['EXPECTED', 'INVOICED', 'RECEIVED', 'CANCELLED']`
- **Strict Invariant**: Any record in `EXPECTED` or `INVOICED` status **MUST NEVER** be aggregated into `Liquid Balance` or the available daily spending pool.
- **Settlement Transition**: When an invoice moves from `INVOICED` $\to$ `RECEIVED`, an atomic transaction executes:
  1. Update `income_sources.status = 'RECEIVED'` and `received_date = CURRENT_TIMESTAMP`.
  2. Insert a new record into `transactions` with `type = 'INCOME'`, `amount = received_amount`, and `wallet_id = target_wallet`.

---

## 2. Flexible Periodicity & Budget Normalization Engine

Users think in different cadences (monthly groceries, quarterly tax/tuition, annual car insurance). The system normalizes all budgets dynamically across any requested timeframe.

### 2.1 Base Periods
A category budget is stored with an explicit `base_period`:
- `MONTHLY` (1 month, 12 cycles/year)
- `QUARTERLY` (3 months, 4 cycles/year)
- `HALF_YEARLY` (6 months, 2 cycles/year)
- `ANNUAL` (12 months, 1 cycle/year)

### 2.2 Bi-directional Normalization Matrix

To convert any stored budget cap $B_{\text{stored}}$ with base period $P_{\text{stored}}$ to target view period $P_{\text{target}}$:

$$\text{Projected Budget} = B_{\text{stored}} \times \frac{\text{Months}(P_{\text{target}})}{\text{Months}(P_{\text{stored}})}$$

| Stored Base Period | Target: Monthly | Target: Quarterly | Target: Half-Yearly | Target: Annual |
| :--- | :--- | :--- | :--- | :--- |
| **MONTHLY** | $\times 1$ | $\times 3$ | $\times 6$ | $\times 12$ |
| **QUARTERLY** | $\div 3$ | $\times 1$ | $\times 2$ | $\times 4$ |
| **HALF_YEARLY** | $\div 6$ | $\div 2$ | $\times 1$ | $\times 2$ |
| **ANNUAL** | $\div 12$ | $\div 4$ | $\div 2$ | $\times 1$ |

### 2.3 Month-To-Date (MTD) Dynamic Burn Velocity

To determine if spending is on track at day $d$ of a month having $D_{\text{total}}$ days:

$$\text{Prorated Budget Target}(d) = \text{Monthly Budget} \times \frac{d}{D_{\text{total}}}$$

$$\text{Burn Velocity Ratio} = \frac{\text{Actual MTD Spend}}{\text{Prorated Budget Target}(d)}$$

- **$\text{Burn Velocity Ratio} \le 1.00$**: Spend pace is safe (Green).
- **$1.00 < \text{Burn Velocity Ratio} \le 1.15$**: Approaching pacing limit (Amber warning).
- **$\text{Burn Velocity Ratio} > 1.15$**: Overburning; projected to exceed monthly cap before month-end (Crimson alert).

---

## 3. Irregular Recurrence & Cadence Normalization

Modern recurring payments do not neatly align with calendar months (e.g., 84-day telecom prepaid recharges, 28-day cycles, 182-day half-yearly broadband, annual software subscriptions).

### 3.1 Daily Reserve Rate (Burn Target)

For any non-monthly recurring cost:

$$\text{Daily Burn Target} = \frac{\text{Billing Cost}}{\text{Cadence in Days}}$$

$$\text{Monthly Reserve Allocation} = \text{Daily Burn Target} \times \text{Days in Current Month}$$

*Example*: An 84-day mobile recharge costing ₹799:
$$\text{Daily Burn} = \frac{799}{84} = ₹9.5119/\text{day}$$
In a 31-day month, the reserve provision needed is:
$$9.5119 \times 31 = ₹294.87$$

### 3.2 Next Due Date & Runway Countdown

Given `last_billed_date` and `interval_days`:
$$\text{Next Due Date} = \text{last\_billed\_date} + \text{interval\_days}$$
$$\text{Days Remaining} = \lceil (\text{Next Due Date} - \text{Current Date}) \rceil$$

- When $\text{Days Remaining} \le 7$: Trigger sticky dashboard pill `Urgent Renewal Due`.
- On settlement: Advance `last_billed_date = Next Due Date` or payment timestamp.

---

## 4. Debt / Lent Money (Udhaar) State Machine

Lending money is an asset transformation, not an expense. The capital leaves the liquid pool and enters a receivables ledger.

```
                  ┌────────────────────────┐
                  │      OUTSTANDING       │
                  │ (Full principal owed)  │
                  └───────────┬────────────┘
                              │
          Partial Repayment   │   Full Repayment
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    │                    ▼
┌──────────────────┐          │          ┌──────────────────┐
│ PARTIALLY_SETTLED│          │          │     SETTLED      │
│ (0 < Bal < Princ)│          │          │ (Balance = 0.00) │
└────────┬─────────┘          │          └──────────────────┘
         │                    │
         │ Full Repayment     │ Uncollectible
         └────────────────────┼────────────────────┐
                              │                    │
                              ▼                    ▼
                       ┌──────────────┐   ┌──────────────────┐
                       │   SETTLED    │   │    DEFAULTED     │
                       │(Balance=0.00)│   │ (Written to Bad) │
                       └──────────────┘   └──────────────────┘
```

### 4.1 State Definitions
- `OUTSTANDING`: Debt created, zero repayments logged.
- `PARTIALLY_SETTLED`: $0 < \sum(\text{Settlements}) < \text{Principal Amount}$.
- `SETTLED`: $\sum(\text{Settlements}) \ge \text{Principal Amount}$.
- `DEFAULTED`: Deemed unrecoverable by user. Active receivable converted into `Bad Debt Expense`.

### 4.2 Mathematical Rules for Lent Transactions
1. **Lending Event**:
   - `WalletBalance` drops by ₹$X$.
   - `ReceivableAsset` increases by ₹$X$.
   - Does **NOT** count as an expense in monthly budget or burn rate.
2. **Repayment Event**:
   - Counterparty returns ₹$Y$ ($Y \le \text{Outstanding Balance}$).
   - `WalletBalance` increases by ₹$Y$.
   - `ReceivableAsset` decreases by ₹$Y$.
   - Does **NOT** count as taxable income or salary inflow.
3. **Default / Write-off**:
   - Remaining balance is written off as an expense of intent `DISCRETIONARY` / category `Bad Debt`.
   - `ReceivableAsset` drops to ₹0.00.

---

## 5. Impulse vs. Value Scoring (Impulse Drain Engine)

To foster financial discipline without cumbersome micro-categorization, every discretionary expense allows an intent tag:

$$\text{expense\_intent} \in \{\text{'NECESSITY'}, \text{'INVESTMENT'}, \text{'DISCRETIONARY'}, \text{'IMPULSE'}\}$$

### 5.1 The Impulse Drain Rate

$$\text{Impulse Drain Rate (\%)} = \left( \frac{\sum \text{Amount}(\text{intent} = \text{'IMPULSE'})}{\sum \text{Amount}(\text{type} = \text{'EXPENSE'})} \right) \times 100$$

### 5.2 Impulse Severity Bands
- **$< 5\%$**: Master of Discipline (Slate/Emerald glow).
- **$5\% - 15\%$**: Nominal Discretionary Drift (Amber warning).
- **$> 15\%$**: Capital Hemorrhage (Crimson alert; displays "Impulse Drain Alert" on Hero strip with estimated opportunity cost).

---

## 6. TypeScript Core Financial Types

```typescript
export type TransactionType = 'EXPENSE' | 'INCOME' | 'LENT' | 'DEBT_REPAYMENT' | 'TRANSFER';
export type IncomeStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED';
export type DebtStatus = 'OUTSTANDING' | 'PARTIALLY_SETTLED' | 'SETTLED' | 'DEFAULTED';
export type CadenceUnit = 'DAYS' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
export type ExpenseIntent = 'NECESSITY' | 'INVESTMENT' | 'DISCRETIONARY' | 'IMPULSE';
export type BasePeriod = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL';

export interface CashFlowSummary {
  liquidBalance: number;
  unreceivedPipeline: number;
  activeLentPrincipal: number;
  monthToDateExpense: number;
  monthToDateBudget: number;
  impulseDrainRate: number;
}
```
