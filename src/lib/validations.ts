import { z } from 'zod';

// Postgres accepts any 128-bit hex string in standard 8-4-4-4-12 UUID format
const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuidSchema = (msg = 'Valid UUID required') => z.string().regex(uuidPattern, { message: msg });

export const TransactionInputSchema = z.object({
  walletId: uuidSchema('Valid wallet ID required'),
  categoryId: uuidSchema().optional().nullable(),
  type: z.enum(['EXPENSE', 'INCOME', 'LENT', 'DEBT_REPAYMENT', 'TRANSFER']),
  amount: z.number().positive({ message: 'Amount must be greater than zero' }).max(100000000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
  intent: z.enum(['NECESSITY', 'INVESTMENT', 'DISCRETIONARY', 'IMPULSE']).default('NECESSITY'),
  notes: z.string().max(500).optional().nullable(),
  debtCounterparty: z.string().min(1).max(128).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const QuickLogSchema = z.object({
  amount: z.number().positive({ message: 'Amount must be greater than zero' }),
  categoryId: uuidSchema('Select a valid category').optional().nullable(),
  walletId: uuidSchema('Select a valid payment account'),
  intent: z.enum(['NECESSITY', 'INVESTMENT', 'DISCRETIONARY', 'IMPULSE']).default('NECESSITY'),
  type: z.enum(['EXPENSE', 'LENT']),
  counterpartyName: z.string().optional(),
  notes: z.string().max(255).optional().nullable(),
});

export const SubscriptionInputSchema = z.object({
  walletId: uuidSchema('Valid wallet ID required').optional().nullable(),
  categoryId: uuidSchema('Valid category ID required'),
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }).max(128),
  billingAmount: z.number().positive({ message: 'Amount must be positive' }),
  cadenceUnit: z.enum(['DAYS', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']),
  intervalDays: z.number().int().positive({ message: 'Interval must be positive days' }).optional().default(30),
  lastBilledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Valid date required' }),
  autoRenew: z.boolean().default(true),
});

export const DebtSettlementSchema = z.object({
  debtId: uuidSchema('Valid debt ID required'),
  walletId: uuidSchema('Valid receiving wallet required'),
  amountReturned: z.number().positive({ message: 'Repayment amount must be greater than zero' }),
  dateReturned: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().max(255).optional().nullable(),
});

export const IncomeSourceSchema = z.object({
  walletId: uuidSchema().optional().nullable(),
  sourceType: z.string().min(2).max(64),
  clientOrEmployer: z.string().min(2).max(128),
  expectedAmount: z.number().positive({ message: 'Amount must be greater than zero' }),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional().nullable(),
});

export const BudgetInputSchema = z.object({
  categoryId: uuidSchema(),
  amount: z.number().positive(),
  basePeriod: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL']).default('MONTHLY'),
});

export const WalletInputSchema = z.object({
  name: z.string().min(2, { message: 'Account name must be at least 2 characters' }).max(64),
  accountType: z.enum(['BANK', 'UPI', 'CASH', 'CREDIT']).default('BANK'),
  isLiquid: z.boolean().default(true),
  startingBalance: z.number().min(0, { message: 'Starting balance cannot be negative' }).default(0),
});

export const WalletUpdateSchema = z.object({
  id: uuidSchema('Valid wallet ID required'),
  name: z.string().min(2, { message: 'Account name must be at least 2 characters' }).max(64),
  accountType: z.enum(['BANK', 'UPI', 'CASH', 'CREDIT']),
  isLiquid: z.boolean().default(true),
});

export const SuspendAndSweepSchema = z.object({
  sourceWalletId: uuidSchema('Valid source wallet ID required'),
  targetWalletId: uuidSchema('Valid destination wallet ID required').optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
});

