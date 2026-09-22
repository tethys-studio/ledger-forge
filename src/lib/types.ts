export type TransactionType = 'EXPENSE' | 'INCOME' | 'LENT' | 'DEBT_REPAYMENT' | 'TRANSFER';
export type IncomeStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED';
export type CadenceUnit = 'DAYS' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
export type ExpenseIntent = 'NECESSITY' | 'INVESTMENT' | 'DISCRETIONARY' | 'IMPULSE';
export type DebtStatus = 'OUTSTANDING' | 'PARTIALLY_SETTLED' | 'SETTLED' | 'DEFAULTED';
export type BudgetPeriod = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL';

export interface User {
  id: string;
  email: string;
  full_name: string;
  default_currency: string;
  created_at: string;
  updated_at: string;
}

export interface AccountWallet {
  id: string;
  user_id: string;
  name: string;
  account_type: 'BANK' | 'UPI' | 'CASH' | 'CREDIT';
  is_liquid: boolean;
  status?: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
  current_balance?: number;
}

export interface Category {
  id: string;
  user_id?: string | null;
  parent_id?: string | null;
  name: string;
  icon?: string | null;
  color?: string | null;
  is_system: boolean;
  created_at: string;
  parent_name?: string | null;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  base_period: BudgetPeriod;
  start_date: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
}

export interface SubscriptionRecurring {
  id: string;
  user_id: string;
  wallet_id: string;
  category_id: string;
  name: string;
  billing_amount: number;
  cadence_unit: CadenceUnit;
  interval_days: number;
  last_billed_date: string;
  next_due_date: string;
  auto_renew: boolean;
  status?: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
  wallet_name?: string;
  category_name?: string;
  daily_amortized_burn?: number;
  days_remaining?: number;
  urgency_status?: 'ROUTINE' | 'URGENT' | 'CRITICAL' | 'OVERDUE';
}

export interface DebtLent {
  id: string;
  user_id: string;
  wallet_id: string;
  counterparty_name: string;
  principal_amount: number;
  date_lent: string;
  due_date?: string | null;
  status: DebtStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  wallet_name?: string;
  total_settled?: number;
  remaining_balance?: number;
  days_elapsed?: number;
}

export interface DebtSettlement {
  id: string;
  debt_id: string;
  wallet_id: string;
  amount_returned: number;
  date_returned: string;
  notes?: string | null;
  created_at: string;
  wallet_name?: string;
}

export interface IncomeSource {
  id: string;
  user_id: string;
  wallet_id?: string | null;
  source_type: string;
  client_or_employer: string;
  expected_amount: number;
  due_date: string;
  status: IncomeStatus;
  received_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  wallet_name?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  category_id?: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  intent: ExpenseIntent;
  is_recurring: boolean;
  subscription_id?: string | null;
  debt_id?: string | null;
  transfer_wallet_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  wallet_name?: string;
  transfer_wallet_name?: string;
  category_name?: string;
  category_color?: string;
  counterparty_name?: string;
}

export interface CashFlowSummary {
  liquidBalance: number;
  unreceivedPipeline: number;
  pendingInvoicesCount: number;
  activeLentPrincipal: number;
  activeLentOutstanding: number;
  activeDebtsCount: number;
  monthToDateExpense: number;
  monthToDateBudget: number;
  proratedBudget: number;
  burnVelocityRatio: number;
  burnStatus: 'SAFE' | 'WARN' | 'DANGER';
  impulseDrainRate: number;
  impulseTotalAmount: number;
  impulseStatus: 'DISCIPLINED' | 'DRIFT' | 'HEMORRHAGE';
}

export interface BurnVelocityPoint {
  day: number;
  date: string;
  actualSpend: number;
  idealSlope: number;
}

export interface CategoryDistribution {
  id: string;
  name: string;
  color: string;
  amount: number;
  percentage: number;
  impulseAmount: number;
}
