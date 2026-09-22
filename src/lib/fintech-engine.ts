import { query, queryOne } from './db';
import {
  CashFlowSummary,
  BurnVelocityPoint,
  CategoryDistribution,
  SubscriptionRecurring,
  DebtLent,
  Transaction,
  AccountWallet,
} from './types';
import { getDaysInMonth, getDate, differenceInCalendarDays, parseISO, format } from 'date-fns';

export const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';

export { formatINR, formatNumber } from './formatters';

/**
 * Authoritative Server-Side Calculation of Cash Flow Summary
 */
export async function getCashFlowSummary(userId: string = DEFAULT_USER_ID): Promise<CashFlowSummary> {
  const now = new Date();
  const currentDay = getDate(now);
  const totalDaysInMonth = getDaysInMonth(now);

  // 1. Authoritative Liquid Balance
  const liquidRow = await queryOne<{ liquid_balance: string }>(
    `SELECT COALESCE(SUM(CASE 
       WHEN type = 'INCOME' THEN amount 
       WHEN type = 'DEBT_REPAYMENT' THEN amount 
       WHEN type = 'EXPENSE' THEN -amount 
       WHEN type = 'LENT' THEN -amount 
       ELSE 0 
     END), 0.00)::NUMERIC(12, 2) AS liquid_balance
     FROM transactions
     WHERE user_id = $1`,
    [userId]
  );
  const liquidBalance = parseFloat(liquidRow?.liquid_balance || '0');

  // 2. Pending Inflow Pipeline (Accrual Tracking - isolated from liquid cash)
  const pipelineRow = await queryOne<{ total_pending: string; count_pending: string }>(
    `SELECT 
       COALESCE(SUM(expected_amount), 0.00)::NUMERIC(12, 2) AS total_pending,
       COUNT(id)::TEXT AS count_pending
     FROM income_sources
     WHERE user_id = $1 AND status = 'PENDING'`,
    [userId]
  );
  const unreceivedPipeline = parseFloat(pipelineRow?.total_pending || '0');
  const pendingInvoicesCount = parseInt(pipelineRow?.count_pending || '0', 10);

  // 3. Active Money Lent Out (Udhaar Receivables)
  const debtRow = await queryOne<{ total_lent: string; total_outstanding: string; active_count: string }>(
    `SELECT 
       COALESCE(SUM(d.principal_amount), 0.00)::NUMERIC(12, 2) AS total_lent,
       COALESCE(SUM(d.principal_amount - COALESCE(s.settled, 0)), 0.00)::NUMERIC(12, 2) AS total_outstanding,
       COUNT(d.id)::TEXT AS active_count
     FROM debts_lent d
     LEFT JOIN (
       SELECT debt_id, SUM(amount_returned) AS settled 
       FROM debt_settlements GROUP BY debt_id
     ) s ON s.debt_id = d.id
     WHERE d.user_id = $1 AND d.status IN ('OUTSTANDING', 'PARTIALLY_SETTLED')`,
    [userId]
  );
  const activeLentPrincipal = parseFloat(debtRow?.total_lent || '0');
  const activeLentOutstanding = parseFloat(debtRow?.total_outstanding || '0');
  const activeDebtsCount = parseInt(debtRow?.active_count || '0', 10);

  // 4. MTD Spending and Impulse Breakdown
  const mtdExpenseRow = await queryOne<{ total_expense: string; impulse_spend: string }>(
    `SELECT 
       COALESCE(SUM(amount), 0.00)::NUMERIC(12, 2) AS total_expense,
       COALESCE(SUM(CASE WHEN intent = 'IMPULSE' THEN amount ELSE 0 END), 0.00)::NUMERIC(12, 2) AS impulse_spend
     FROM transactions
     WHERE user_id = $1 
       AND type = 'EXPENSE' 
       AND date >= date_trunc('month', CURRENT_DATE) 
       AND date <= CURRENT_DATE`,
    [userId]
  );
  const monthToDateExpense = parseFloat(mtdExpenseRow?.total_expense || '0');
  const impulseTotalAmount = parseFloat(mtdExpenseRow?.impulse_spend || '0');

  // 5. Total Monthly Budget (Dynamic Normalization across base periods)
  const budgets = await query<{ amount: string; base_period: string }>(
    `SELECT amount, base_period FROM budgets WHERE user_id = $1`,
    [userId]
  );

  let monthToDateBudget = 0;
  for (const b of budgets) {
    const amt = parseFloat(b.amount);
    switch (b.base_period) {
      case 'MONTHLY':
        monthToDateBudget += amt;
        break;
      case 'QUARTERLY':
        monthToDateBudget += amt / 3;
        break;
      case 'HALF_YEARLY':
        monthToDateBudget += amt / 6;
        break;
      case 'ANNUAL':
        monthToDateBudget += amt / 12;
        break;
    }
  }

  // Prorated Budget Target for today: (currentDay / totalDaysInMonth) * monthToDateBudget
  const proratedBudget = monthToDateBudget > 0 ? (currentDay / totalDaysInMonth) * monthToDateBudget : 0;
  const burnVelocityRatio = proratedBudget > 0 ? monthToDateExpense / proratedBudget : 0;

  let burnStatus: 'SAFE' | 'WARN' | 'DANGER' = 'SAFE';
  if (monthToDateBudget > 0) {
    if (burnVelocityRatio > 1.15) {
      burnStatus = 'DANGER';
    } else if (burnVelocityRatio > 1.0) {
      burnStatus = 'WARN';
    }
  }

  // Impulse Drain Rate: (impulseTotalAmount / monthToDateExpense) * 100
  const impulseDrainRate = monthToDateExpense > 0 ? (impulseTotalAmount / monthToDateExpense) * 100 : 0;
  let impulseStatus: 'DISCIPLINED' | 'DRIFT' | 'HEMORRHAGE' = 'DISCIPLINED';
  if (impulseDrainRate > 15) {
    impulseStatus = 'HEMORRHAGE';
  } else if (impulseDrainRate >= 5) {
    impulseStatus = 'DRIFT';
  }

  return {
    liquidBalance,
    unreceivedPipeline,
    pendingInvoicesCount,
    activeLentPrincipal,
    activeLentOutstanding,
    activeDebtsCount,
    monthToDateExpense,
    monthToDateBudget,
    proratedBudget,
    burnVelocityRatio,
    burnStatus,
    impulseDrainRate,
    impulseTotalAmount,
    impulseStatus,
  };
}

/**
 * Sinking Fund and Irregular Subscription Runways
 */
function formatDateString(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) return format(val, 'yyyy-MM-dd');
  return String(val).split('T')[0];
}

export async function getSinkingFunds(userId: string = DEFAULT_USER_ID): Promise<SubscriptionRecurring[]> {
  const isAll = userId === 'ALL';
  const queryText = `SELECT 
       s.*,
       w.name AS wallet_name,
       c.name AS category_name
     FROM subscriptions_recurring s
     LEFT JOIN accounts_or_wallets w ON w.id = s.wallet_id
     LEFT JOIN categories c ON c.id = s.category_id
     ${isAll ? '' : 'WHERE s.user_id = $1'}
     ORDER BY s.next_due_date ASC`;

  const rows = await query<SubscriptionRecurring & { wallet_name: string; category_name: string }>(
    queryText,
    isAll ? [] : [userId]
  );

  const now = new Date();

  return rows.map((s) => {
    const billingAmount = parseFloat(s.billing_amount as unknown as string);
    const intervalDays = parseInt(s.interval_days as unknown as string, 10) || 30;
    const dailyAmortized = billingAmount / intervalDays;
    const nextDueDateStr = formatDateString(s.next_due_date);
    const lastBilledDateStr = formatDateString(s.last_billed_date);

    let daysRemaining = 0;
    try {
      daysRemaining = differenceInCalendarDays(parseISO(nextDueDateStr), now);
    } catch {
      daysRemaining = 0;
    }

    const isSuspended = s.status === 'SUSPENDED';

    let urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL' | 'OVERDUE' = 'ROUTINE';
    if (!isSuspended) {
      if (daysRemaining < 0) {
        urgency = 'OVERDUE';
      } else if (daysRemaining <= 1) {
        urgency = 'CRITICAL';
      } else if (daysRemaining <= 3) {
        urgency = 'URGENT';
      } else if (daysRemaining <= 7) {
        urgency = 'ROUTINE';
      }
    }

    return {
      ...s,
      status: (s.status as 'ACTIVE' | 'SUSPENDED') || 'ACTIVE',
      billing_amount: billingAmount,
      interval_days: intervalDays,
      daily_amortized_burn: isSuspended ? 0 : Math.round(dailyAmortized * 100) / 100,
      days_remaining: daysRemaining,
      urgency_status: urgency,
      next_due_date: nextDueDateStr,
      last_billed_date: lastBilledDateStr,
    };
  });
}

/**
 * Burn Rate Velocity Chart Timeline (Actual MTD cumulative vs Ideal Linear Slope)
 */
export async function getBurnVelocityTimeline(userId: string = DEFAULT_USER_ID): Promise<BurnVelocityPoint[]> {
  const now = new Date();
  const currentDay = getDate(now);
  const totalDays = getDaysInMonth(now);

  const summary = await getCashFlowSummary(userId);
  const totalBudget = summary.monthToDateBudget;
  const idealDailyRate = totalBudget / totalDays;

  // Retrieve all expenses of current month grouped by date
  const expenseRows = await query<{ tx_date: string; daily_spend: string }>(
    `SELECT 
       to_char(date, 'YYYY-MM-DD') AS tx_date,
       SUM(amount) AS daily_spend
     FROM transactions
     WHERE user_id = $1 
       AND type = 'EXPENSE'
       AND date >= date_trunc('month', CURRENT_DATE)
       AND date <= CURRENT_DATE
     GROUP BY date
     ORDER BY date ASC`,
    [userId]
  );

  const dailySpendMap = new Map<number, number>();
  for (const row of expenseRows) {
    const day = parseInt(row.tx_date.split('-')[2], 10);
    dailySpendMap.set(day, parseFloat(row.daily_spend));
  }

  const timeline: BurnVelocityPoint[] = [];
  let cumulative = 0;

  for (let d = 1; d <= totalDays; d++) {
    const idealSlope = Math.round(idealDailyRate * d);

    if (d <= currentDay) {
      const spendToday = dailySpendMap.get(d) || 0;
      cumulative += spendToday;
      timeline.push({
        day: d,
        date: `${d} ${format(now, 'MMM')}`,
        actualSpend: Math.round(cumulative),
        idealSlope,
      });
    } else {
      // Future days in month: actualSpend is undefined/null or projected
      timeline.push({
        day: d,
        date: `${d} ${format(now, 'MMM')}`,
        actualSpend: Math.round(cumulative), // flat projection or omit in tooltip
        idealSlope,
      });
    }
  }

  return timeline;
}

/**
 * Category Breakdown & Impulse Proportion
 */
export async function getCategoryBreakdown(userId: string = DEFAULT_USER_ID): Promise<CategoryDistribution[]> {
  const rows = await query<{
    id: string;
    name: string;
    color: string;
    total_amount: string;
    impulse_amount: string;
  }>(
    `SELECT 
       COALESCE(c.id::text, 'uncategorized') AS id,
       COALESCE(c.name, 'General Expenses') AS name,
       COALESCE(c.color, '#64748B') AS color,
       SUM(t.amount)::NUMERIC(12, 2) AS total_amount,
       SUM(CASE WHEN t.intent = 'IMPULSE' THEN t.amount ELSE 0 END)::NUMERIC(12, 2) AS impulse_amount
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 
       AND t.type = 'EXPENSE'
       AND t.date >= date_trunc('month', CURRENT_DATE)
     GROUP BY c.id, c.name, c.color
     ORDER BY total_amount DESC`,
    [userId]
  );

  let grandTotal = 0;
  const items = rows.map((r) => {
    const amt = parseFloat(r.total_amount);
    grandTotal += amt;
    return {
      id: r.id,
      name: r.name,
      color: r.color,
      amount: amt,
      percentage: 0,
      impulseAmount: parseFloat(r.impulse_amount || '0'),
    };
  });

  return items.map((item) => ({
    ...item,
    percentage: grandTotal > 0 ? Math.round((item.amount / grandTotal) * 1000) / 10 : 0,
  }));
}

/**
 * Active Udhaar (Debts Lent) Watchlist
 */
export async function getActiveDebts(userId: string = DEFAULT_USER_ID): Promise<DebtLent[]> {
  const rows = await query<
    DebtLent & {
      wallet_name: string;
      total_settled: string;
      remaining_balance: string;
      days_elapsed: string;
    }
  >(
    `SELECT 
       d.*,
       w.name AS wallet_name,
       COALESCE(s.settled, 0.00)::NUMERIC(12, 2) AS total_settled,
       (d.principal_amount - COALESCE(s.settled, 0.00))::NUMERIC(12, 2) AS remaining_balance,
       (CURRENT_DATE - d.date_lent) AS days_elapsed
     FROM debts_lent d
     LEFT JOIN accounts_or_wallets w ON w.id = d.wallet_id
     LEFT JOIN (
       SELECT debt_id, SUM(amount_returned) AS settled 
       FROM debt_settlements GROUP BY debt_id
     ) s ON s.debt_id = d.id
     WHERE d.user_id = $1
     ORDER BY 
       CASE WHEN d.status = 'OUTSTANDING' THEN 1 WHEN d.status = 'PARTIALLY_SETTLED' THEN 2 ELSE 3 END,
       d.date_lent DESC`,
    [userId]
  );

  return rows.map((r) => ({
    ...r,
    principal_amount: parseFloat(r.principal_amount as unknown as string),
    total_settled: parseFloat(r.total_settled || '0'),
    remaining_balance: parseFloat(r.remaining_balance || '0'),
    days_elapsed: parseInt(r.days_elapsed || '0', 10),
    date_lent: formatDateString(r.date_lent),
    due_date: r.due_date ? formatDateString(r.due_date) : null,
  }));
}

/**
 * Recent Transactions
 */
export async function getRecentTransactions(
  userId: string = DEFAULT_USER_ID,
  limit: number = 10
): Promise<Transaction[]> {
  const rows = await query<
    Transaction & {
      wallet_name: string;
      transfer_wallet_name?: string;
      category_name: string;
      category_color: string;
      counterparty_name: string;
    }
  >(
    `SELECT 
       t.*,
       w.name AS wallet_name,
       tw.name AS transfer_wallet_name,
       c.name AS category_name,
       c.color AS category_color,
       d.counterparty_name
     FROM transactions t
     LEFT JOIN accounts_or_wallets w ON w.id = t.wallet_id
     LEFT JOIN accounts_or_wallets tw ON tw.id = t.transfer_wallet_id
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN debts_lent d ON d.id = t.debt_id
     WHERE t.user_id = $1
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return rows.map((r) => ({
    ...r,
    amount: parseFloat(r.amount as unknown as string),
    date: formatDateString(r.date),
  }));
}

/**
 * Wallets with authoritatively computed current balances taking into account internal transfers
 */
export async function getWalletsWithBalance(userId: string = DEFAULT_USER_ID): Promise<AccountWallet[]> {
  const rows = await query<AccountWallet & { current_balance: string }>(
    `SELECT 
       w.*,
       (
         COALESCE((
           SELECT SUM(CASE 
             WHEN t.type IN ('INCOME', 'DEBT_REPAYMENT') THEN t.amount 
             WHEN t.type IN ('EXPENSE', 'LENT', 'TRANSFER') THEN -t.amount 
             ELSE 0 
           END)
           FROM transactions t
           WHERE t.wallet_id = w.id
         ), 0.00)
         +
         COALESCE((
           SELECT SUM(t.amount)
           FROM transactions t
           WHERE t.transfer_wallet_id = w.id AND t.type = 'TRANSFER'
         ), 0.00)
       )::NUMERIC(12, 2) AS current_balance
     FROM accounts_or_wallets w
     WHERE w.user_id = $1
     ORDER BY 
       CASE WHEN w.status = 'ACTIVE' THEN 1 ELSE 2 END,
       w.is_liquid DESC, 
       w.name ASC`,
    [userId]
  );

  return rows.map((w) => ({
    ...w,
    current_balance: parseFloat(w.current_balance || '0'),
  }));
}

/**
 * Active Wallets Only (excludes suspended/closed accounts)
 */
export async function getActiveWallets(userId: string = DEFAULT_USER_ID): Promise<AccountWallet[]> {
  return query<AccountWallet>(
    `SELECT * FROM accounts_or_wallets 
     WHERE user_id = $1 AND (status = 'ACTIVE' OR status IS NULL)
     ORDER BY is_liquid DESC, name ASC`,
    [userId]
  );
}
