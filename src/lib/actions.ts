'use server';

import { revalidatePath } from 'next/cache';
import { query, queryOne, getSql } from './db';
import {
  QuickLogSchema,
  TransactionInputSchema,
  DebtSettlementSchema,
  SubscriptionInputSchema,
  IncomeSourceSchema,
  WalletInputSchema,
  WalletUpdateSchema,
  SuspendAndSweepSchema,
} from './validations';
import { getAuthenticatedUser } from './auth-helpers';
import { addDays, addMonths, addYears, parseISO, format, differenceInCalendarDays } from 'date-fns';

/**
 * Sub-8-Second Quick Log Server Action
 */
export async function logQuickExpense(formData: unknown) {
  const data = QuickLogSchema.parse(formData);
  const user = await getAuthenticatedUser();
  const userId = user.id;
  const today = format(new Date(), 'yyyy-MM-dd');

  if (data.type === 'LENT') {
    // 1. Create debt record
    const counterparty = data.counterpartyName?.trim() || 'Unspecified Contact';
    const debt = await queryOne<{ id: string }>(
      `INSERT INTO debts_lent (user_id, wallet_id, counterparty_name, principal_amount, date_lent, status, notes)
       VALUES ($1, $2, $3, $4, $5, 'OUTSTANDING', $6)
       RETURNING id`,
      [userId, data.walletId, counterparty, data.amount, today, data.notes || 'Quick Logged Loan']
    );

    if (!debt) throw new Error('Failed to create debt record');

    // 2. Create LENT transaction (deducts liquid balance, creates receivable)
    await query(
      `INSERT INTO transactions (user_id, wallet_id, type, amount, date, intent, debt_id, notes)
       VALUES ($1, $2, 'LENT', $3, $4, $5, $6, $7)`,
      [
        userId,
        data.walletId,
        data.amount,
        today,
        data.intent,
        debt.id,
        `Money Lent to ${counterparty}${data.notes ? ` - ${data.notes}` : ''}`,
      ]
    );
  } else {
    // Standard Expense
    await query(
      `INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, date, intent, notes)
       VALUES ($1, $2, $3, 'EXPENSE', $4, $5, $6, $7)`,
      [
        userId,
        data.walletId,
        data.categoryId || null,
        data.amount,
        today,
        data.intent,
        data.notes || 'Quick Logged Expense',
      ]
    );
  }

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/debts');
  return { success: true };
}

/**
 * Detailed Transaction Creation
 */
export async function createTransaction(formData: unknown) {
  const data = TransactionInputSchema.parse(formData);
  const user = await getAuthenticatedUser();
  const userId = user.id;

  if (data.type === 'LENT') {
    const counterparty = data.debtCounterparty || 'Unspecified';
    const debt = await queryOne<{ id: string }>(
      `INSERT INTO debts_lent (user_id, wallet_id, counterparty_name, principal_amount, date_lent, due_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'OUTSTANDING', $7)
       RETURNING id`,
      [userId, data.walletId, counterparty, data.amount, data.date, data.dueDate || null, data.notes]
    );

    await query(
      `INSERT INTO transactions (user_id, wallet_id, type, amount, date, intent, debt_id, notes)
       VALUES ($1, $2, 'LENT', $3, $4, $5, $6, $7)`,
      [userId, data.walletId, data.amount, data.date, data.intent, debt?.id, data.notes]
    );
  } else {
    await query(
      `INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, date, intent, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        data.walletId,
        data.categoryId || null,
        data.type,
        data.amount,
        data.date,
        data.intent,
        data.notes,
      ]
    );
  }

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/debts');
  return { success: true };
}

/**
 * Atomic Debt Repayment Settlement
 */
export async function settleDebtPayment(formData: unknown) {
  const data = DebtSettlementSchema.parse(formData);
  const user = await getAuthenticatedUser();
  const userId = user.id;

  // 1. Get debt info
  const debt = await queryOne<{ principal_amount: string; counterparty_name: string }>(
    `SELECT principal_amount, counterparty_name FROM debts_lent WHERE id = $1 AND user_id = $2`,
    [data.debtId, userId]
  );
  if (!debt) throw new Error('Debt not found');

  // 2. Insert settlement record
  await query(
    `INSERT INTO debt_settlements (debt_id, wallet_id, amount_returned, date_returned, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.debtId, data.walletId, data.amountReturned, data.dateReturned, data.notes]
  );

  // 3. Record liquid repayment transaction
  await query(
    `INSERT INTO transactions (user_id, wallet_id, type, amount, date, intent, debt_id, notes)
     VALUES ($1, $2, 'DEBT_REPAYMENT', $3, $4, 'NECESSITY', $5, $6)`,
    [
      userId,
      data.walletId,
      data.amountReturned,
      data.dateReturned,
      data.debtId,
      `Repayment from ${debt.counterparty_name}${data.notes ? ` - ${data.notes}` : ''}`,
    ]
  );

  // 4. Update debt status
  const calcRow = await queryOne<{ total_returned: string }>(
    `SELECT COALESCE(SUM(amount_returned), 0.00)::NUMERIC(12, 2) AS total_returned 
     FROM debt_settlements WHERE debt_id = $1`,
    [data.debtId]
  );

  const principal = parseFloat(debt.principal_amount);
  const totalReturned = parseFloat(calcRow?.total_returned || '0');
  const newStatus = totalReturned >= principal ? 'SETTLED' : 'PARTIALLY_SETTLED';

  await query(
    `UPDATE debts_lent SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [newStatus, data.debtId]
  );

  revalidatePath('/');
  revalidatePath('/debts');
  revalidatePath('/transactions');
  return { success: true, newStatus };
}

/**
 * Write Off Uncollectible Debt
 */
export async function writeOffDebt(debtId: string) {
  const user = await getAuthenticatedUser();
  const userId = user.id;
  await query(
    `UPDATE debts_lent SET status = 'DEFAULTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`,
    [debtId, userId]
  );

  revalidatePath('/');
  revalidatePath('/debts');
  return { success: true };
}

/**
 * Atomic Pipeline Inflow Transition to "Received in Bank"
 */
export async function transitionIncomeReceived(incomeSourceId: string, walletId: string) {
  const user = await getAuthenticatedUser();
  const userId = user.id;

  const income = await queryOne<{ expected_amount: string; client_or_employer: string; source_type: string }>(
    `SELECT expected_amount, client_or_employer, source_type 
     FROM income_sources 
     WHERE id = $1 AND user_id = $2 AND status = 'PENDING'`,
    [incomeSourceId, userId]
  );
  if (!income) throw new Error('Income source not found or already received');

  const amount = parseFloat(income.expected_amount);
  const today = format(new Date(), 'yyyy-MM-dd');

  // 1. Update income source status
  await query(
    `UPDATE income_sources 
     SET status = 'RECEIVED', wallet_id = $1, received_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2`,
    [walletId, incomeSourceId]
  );

  // 2. Insert into master transactions ledger to credit liquid cash
  await query(
    `INSERT INTO transactions (user_id, wallet_id, type, amount, date, intent, notes)
     VALUES ($1, $2, 'INCOME', $3, $4, 'NECESSITY', $5)`,
    [
      userId,
      walletId,
      amount,
      today,
      `Received from ${income.client_or_employer} (${income.source_type})`,
    ]
  );

  revalidatePath('/');
  revalidatePath('/income');
  revalidatePath('/transactions');
  return { success: true };
}

/**
 * Create or Register Inflow Source (Pipeline)
 */
export async function createIncomeSource(formData: unknown) {
  const data = IncomeSourceSchema.parse(formData);
  const user = await getAuthenticatedUser();
  const userId = user.id;

  await query(
    `INSERT INTO income_sources (user_id, wallet_id, source_type, client_or_employer, expected_amount, due_date, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7)`,
    [
      userId,
      data.walletId || null,
      data.sourceType,
      data.clientOrEmployer,
      data.expectedAmount,
      data.dueDate,
      data.notes,
    ]
  );

  revalidatePath('/income');
  revalidatePath('/');
  return { success: true };
}

/**
 * Create or Update Sinking Fund / Recurring Outflow
 */
export async function createSubscription(formData: unknown) {
  const data = SubscriptionInputSchema.parse(formData);
  const user = await getAuthenticatedUser();
  const userId = user.id;

  // Calculate next due date automatically: calendar months for MONTHLY/QUARTERLY/HALF_YEARLY/YEARLY, days for DAYS
  const lastDate = parseISO(data.lastBilledDate);
  let nextDueDateObj: Date;
  let intervalDays = data.intervalDays || 30;

  if (data.cadenceUnit === 'HALF_YEARLY') {
    nextDueDateObj = addMonths(lastDate, 6);
    intervalDays = differenceInCalendarDays(nextDueDateObj, lastDate);
  } else if (data.cadenceUnit === 'MONTHLY') {
    nextDueDateObj = addMonths(lastDate, 1);
    intervalDays = differenceInCalendarDays(nextDueDateObj, lastDate);
  } else if (data.cadenceUnit === 'QUARTERLY') {
    nextDueDateObj = addMonths(lastDate, 3);
    intervalDays = differenceInCalendarDays(nextDueDateObj, lastDate);
  } else if (data.cadenceUnit === 'YEARLY') {
    nextDueDateObj = addYears(lastDate, 1);
    intervalDays = differenceInCalendarDays(nextDueDateObj, lastDate);
  } else {
    // Fixed Days (e.g. 84-day telecom)
    nextDueDateObj = addDays(lastDate, data.intervalDays);
    intervalDays = data.intervalDays;
  }

  const nextDueDate = format(nextDueDateObj, 'yyyy-MM-dd');

  await query(
    `INSERT INTO subscriptions_recurring 
       (user_id, wallet_id, category_id, name, billing_amount, cadence_unit, interval_days, last_billed_date, next_due_date, auto_renew)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      userId,
      data.walletId || null,
      data.categoryId,
      data.name,
      data.billingAmount,
      data.cadenceUnit,
      intervalDays,
      data.lastBilledDate,
      nextDueDate,
      data.autoRenew,
    ]
  );

  revalidatePath('/');
  revalidatePath('/subscriptions');
  return { success: true };
}

export interface RenewSubscriptionPayload {
  subscriptionId: string;
  amount?: number;
  intervalDays?: number;
  cadenceUnit?: 'HALF_YEARLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'DAYS';
  renewalDate?: string;
  walletId?: string | null;
}

/**
 * Mark Recurring Subscription Renewed (Flexible recharge amounts & intervals)
 */
export async function renewSubscription(payloadOrId: string | RenewSubscriptionPayload) {
  const user = await getAuthenticatedUser();
  const userId = user.id;

  const subscriptionId = typeof payloadOrId === 'string' ? payloadOrId : payloadOrId.subscriptionId;
  const options: Partial<RenewSubscriptionPayload> = typeof payloadOrId === 'object' ? payloadOrId : {};

  const sub = await queryOne<{
    wallet_id: string;
    category_id: string;
    name: string;
    billing_amount: string;
    cadence_unit: string;
    interval_days: number;
    next_due_date: string;
  }>(
    `SELECT wallet_id, category_id, name, billing_amount, cadence_unit, interval_days, next_due_date 
     FROM subscriptions_recurring WHERE id = $1 AND user_id = $2`,
    [subscriptionId, userId]
  );

  if (!sub) throw new Error('Subscription not found');

  const renewalDate = options.renewalDate || format(new Date(), 'yyyy-MM-dd');
  const amount = options.amount !== undefined && options.amount > 0 ? options.amount : parseFloat(sub.billing_amount);
  const targetWalletId = options.walletId !== undefined ? options.walletId : sub.wallet_id;
  const targetCadenceUnit = options.cadenceUnit || (sub.cadence_unit as 'HALF_YEARLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'DAYS');

  // 1. Record the renewal transaction with authoritative amount and wallet
  await query(
    `INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, date, intent, is_recurring, subscription_id, notes)
     VALUES ($1, $2, $3, 'EXPENSE', $4, $5, 'NECESSITY', TRUE, $6, $7)`,
    [
      userId,
      targetWalletId,
      sub.category_id,
      amount,
      renewalDate,
      subscriptionId,
      `Renewal: ${sub.name} (₹${amount.toLocaleString('en-IN')})`,
    ]
  );

  // 2. Calculate next due date from the renewalDate by the new cadence/days
  const baseDate = parseISO(renewalDate);
  let advancedDueDate: Date;
  let newIntervalDays = options.intervalDays || sub.interval_days;

  if (targetCadenceUnit === 'HALF_YEARLY') {
    advancedDueDate = addMonths(baseDate, 6);
    newIntervalDays = differenceInCalendarDays(advancedDueDate, baseDate);
  } else if (targetCadenceUnit === 'MONTHLY') {
    advancedDueDate = addMonths(baseDate, 1);
    newIntervalDays = differenceInCalendarDays(advancedDueDate, baseDate);
  } else if (targetCadenceUnit === 'QUARTERLY') {
    advancedDueDate = addMonths(baseDate, 3);
    newIntervalDays = differenceInCalendarDays(advancedDueDate, baseDate);
  } else if (targetCadenceUnit === 'YEARLY') {
    advancedDueDate = addYears(baseDate, 1);
    newIntervalDays = differenceInCalendarDays(advancedDueDate, baseDate);
  } else {
    newIntervalDays = options.intervalDays && options.intervalDays > 0 ? options.intervalDays : sub.interval_days;
    advancedDueDate = addDays(baseDate, newIntervalDays);
  }

  const nextDateStr = format(advancedDueDate, 'yyyy-MM-dd');

  // 3. Update subscription with the new amount, interval days, cadence, wallet, and dates, and ensure it is active
  await query(
    `UPDATE subscriptions_recurring 
     SET billing_amount = $1,
         interval_days = $2,
         cadence_unit = $3,
         wallet_id = $4,
         last_billed_date = $5,
         next_due_date = $6,
         status = 'ACTIVE',
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = $7 AND user_id = $8`,
    [
      amount,
      newIntervalDays,
      targetCadenceUnit,
      targetWalletId,
      renewalDate,
      nextDateStr,
      subscriptionId,
      userId,
    ]
  );

  revalidatePath('/');
  revalidatePath('/subscriptions');
  revalidatePath('/transactions');
  return { success: true };
}

/**
 * Suspend an Active Subscription
 * Halts daily amortized burn, pauses recurring expenses, and stops calendar / telegram alarms.
 */
export async function suspendSubscription(subscriptionId: string) {
  const user = await getAuthenticatedUser();
  const userId = user.id;

  const result = await queryOne<{ id: string; name: string }>(
    `UPDATE subscriptions_recurring 
     SET status = 'SUSPENDED', updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 AND user_id = $2
     RETURNING id, name`,
    [subscriptionId, userId]
  );

  if (!result) {
    throw new Error('Subscription not found or unauthorized');
  }

  revalidatePath('/');
  revalidatePath('/subscriptions');
  revalidatePath('/transactions');
  return { success: true, subscription: result };
}

/**
 * Reactivate a Suspended Subscription
 * Restores daily amortized burn and reenables calendar / telegram alarms.
 */
export async function reactivateSubscription(subscriptionId: string) {
  const user = await getAuthenticatedUser();
  const userId = user.id;

  const result = await queryOne<{ id: string; name: string }>(
    `UPDATE subscriptions_recurring 
     SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 AND user_id = $2
     RETURNING id, name`,
    [subscriptionId, userId]
  );

  if (!result) {
    throw new Error('Subscription not found or unauthorized');
  }

  revalidatePath('/');
  revalidatePath('/subscriptions');
  revalidatePath('/transactions');
  return { success: true, subscription: result };
}

/**
 * Delete Transaction
 */
export async function deleteTransaction(transactionId: string) {
  const user = await getAuthenticatedUser();
  const userId = user.id;
  await query(`DELETE FROM transactions WHERE id = $1 AND user_id = $2`, [transactionId, userId]);

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/debts');
  return { success: true };
}

/**
 * Create Account / Wallet with optional Starting Balance
 */
export async function createWallet(formData: unknown) {
  const data = WalletInputSchema.parse(formData);
  const user = await getAuthenticatedUser();
  const userId = user.id;
  const today = format(new Date(), 'yyyy-MM-dd');

  const wallet = await queryOne<{ id: string }>(
    `INSERT INTO accounts_or_wallets (user_id, name, account_type, is_liquid)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId, data.name.trim(), data.accountType, data.isLiquid]
  );

  if (!wallet) throw new Error('Failed to create account');

  if (data.startingBalance > 0) {
    await query(
      `INSERT INTO transactions (user_id, wallet_id, type, amount, date, intent, notes)
       VALUES ($1, $2, 'INCOME', $3, $4, 'NECESSITY', 'Initial Starting Balance')`,
      [userId, wallet.id, data.startingBalance, today]
    );
  }

  revalidatePath('/wallets');
  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/income');
  revalidatePath('/subscriptions');
  revalidatePath('/debts');
  return { success: true, walletId: wallet.id };
}

/**
 * Update Wallet metadata (name, account type, liquid status)
 */
export async function updateWallet(formData: unknown) {
  const data = WalletUpdateSchema.parse(formData);
  const user = await getAuthenticatedUser();
  const userId = user.id;

  await query(
    `UPDATE accounts_or_wallets 
     SET name = $1, account_type = $2, is_liquid = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 AND user_id = $5`,
    [data.name.trim(), data.accountType, data.isLiquid, data.id, userId]
  );

  revalidatePath('/wallets');
  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/income');
  revalidatePath('/subscriptions');
  revalidatePath('/debts');
  return { success: true };
}

/**
 * Suspend and Sweep Wallet Balance Workflow
 * Atomically transfers remaining balance to target active wallet, then sets source status to SUSPENDED.
 */
export async function suspendAndSweepWallet(formData: unknown) {
  const data = SuspendAndSweepSchema.parse(formData);
  const user = await getAuthenticatedUser();
  const userId = user.id;
  const today = format(new Date(), 'yyyy-MM-dd');

  // 1. Verify source wallet
  const sourceWallet = await queryOne<{ id: string; name: string; status: string }>(
    `SELECT id, name, status FROM accounts_or_wallets WHERE id = $1 AND user_id = $2`,
    [data.sourceWalletId, userId]
  );
  if (!sourceWallet) {
    throw new Error('Source account not found.');
  }
  if (sourceWallet.status === 'SUSPENDED') {
    throw new Error('Account is already suspended.');
  }

  // 2. Fetch authoritative current balance of source wallet
  const balRow = await queryOne<{ current_balance: string }>(
    `SELECT (
       COALESCE((
         SELECT SUM(CASE 
           WHEN t.type IN ('INCOME', 'DEBT_REPAYMENT') THEN t.amount 
           WHEN t.type IN ('EXPENSE', 'LENT', 'TRANSFER') THEN -t.amount 
           ELSE 0 
         END)
         FROM transactions t
         WHERE t.wallet_id = $1
       ), 0.00)
       +
       COALESCE((
         SELECT SUM(t.amount)
         FROM transactions t
         WHERE t.transfer_wallet_id = $1 AND t.type = 'TRANSFER'
       ), 0.00)
     )::NUMERIC(12, 2) AS current_balance`,
    [data.sourceWalletId]
  );

  const balanceNum = parseFloat(balRow?.current_balance || '0');

  // 3. If balance > 0, validate destination wallet and run atomic transaction
  if (balanceNum > 0) {
    if (!data.targetWalletId) {
      throw new Error('A destination wallet is required to sweep the remaining balance of ₹' + balanceNum.toFixed(2));
    }
    if (data.targetWalletId === data.sourceWalletId) {
      throw new Error('Destination wallet cannot be the same as the wallet being closed.');
    }

    const targetWallet = await queryOne<{ id: string; name: string; status: string }>(
      `SELECT id, name, status FROM accounts_or_wallets WHERE id = $1 AND user_id = $2`,
      [data.targetWalletId, userId]
    );
    if (!targetWallet) {
      throw new Error('Destination wallet not found.');
    }
    if (targetWallet.status === 'SUSPENDED') {
      throw new Error('Destination wallet must be an active account.');
    }

    const sweepNotes = data.notes?.trim() || `Account closure balance sweep to ${targetWallet.name}`;

    // Atomic Neon Database Transaction
    const sql = getSql();
    await sql.transaction((tx) => [
      tx`INSERT INTO transactions (user_id, wallet_id, transfer_wallet_id, type, amount, date, intent, notes)
         VALUES (${userId}, ${data.sourceWalletId}, ${data.targetWalletId}, 'TRANSFER', ${balanceNum}, ${today}, 'NECESSITY', ${sweepNotes})`,
      tx`UPDATE accounts_or_wallets SET status = 'SUSPENDED', updated_at = CURRENT_TIMESTAMP WHERE id = ${data.sourceWalletId} AND user_id = ${userId}`
    ]);
  } else {
    // Zero or negative balance - simply suspend
    await query(
      `UPDATE accounts_or_wallets SET status = 'SUSPENDED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`,
      [data.sourceWalletId, userId]
    );
  }

  revalidatePath('/wallets');
  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/income');
  revalidatePath('/subscriptions');
  revalidatePath('/debts');
  return { success: true, sweptAmount: balanceNum };
}

/**
 * Reactivate a Suspended Account
 */
export async function reactivateWallet(walletId: string) {
  const user = await getAuthenticatedUser();
  const userId = user.id;
  await query(
    `UPDATE accounts_or_wallets SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`,
    [walletId, userId]
  );

  revalidatePath('/wallets');
  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/income');
  revalidatePath('/subscriptions');
  revalidatePath('/debts');
  return { success: true };
}

/**
 * Upsert Category Budget
 */
export async function upsertBudget(categoryId: string, amount: number, basePeriod: string = 'MONTHLY') {
  const user = await getAuthenticatedUser();
  const userId = user.id;
  await query(
    `INSERT INTO budgets (user_id, category_id, amount, base_period)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, category_id) 
     DO UPDATE SET amount = EXCLUDED.amount, base_period = EXCLUDED.base_period, updated_at = CURRENT_TIMESTAMP`,
    [userId, categoryId, amount, basePeriod]
  );

  revalidatePath('/');
  return { success: true };
}

/**
 * Batch Upsert Budgets across multiple categories
 */
export async function batchUpsertBudgets(items: { categoryId: string; amount: number; basePeriod?: string }[]) {
  const user = await getAuthenticatedUser();
  const userId = user.id;
  for (const item of items) {
    if (item.amount > 0) {
      await query(
        `INSERT INTO budgets (user_id, category_id, amount, base_period)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, category_id) 
         DO UPDATE SET amount = EXCLUDED.amount, base_period = EXCLUDED.base_period, updated_at = CURRENT_TIMESTAMP`,
        [userId, item.categoryId, item.amount, item.basePeriod || 'MONTHLY']
      );
    }
  }

  revalidatePath('/');
  return { success: true };
}
