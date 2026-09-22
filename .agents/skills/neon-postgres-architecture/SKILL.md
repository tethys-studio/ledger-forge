---
name: neon-postgres-architecture
description: "Rigid PostgreSQL schema definitions, indexing strategies, atomic transaction rules, and Neon MCP integration standards for LedgerForge."
---

# Neon PostgreSQL Architecture Specification

This operational skill governs database schema design, index optimization, atomic transaction boundaries, and Neon MCP tool invocation rules for LedgerForge.

---

## 1. PostgreSQL Schema Definition

The database runs on Neon Serverless PostgreSQL (v16+). All monetary values use `NUMERIC(12, 2)` to eliminate floating-point drift. All primary keys use `UUID` generated via `gen_random_uuid()`.

### 1.1 Enumerated Types (Enums)

```sql
CREATE TYPE transaction_type AS ENUM (
  'EXPENSE',
  'INCOME',
  'LENT',
  'DEBT_REPAYMENT',
  'TRANSFER'
);

CREATE TYPE income_status AS ENUM (
  'PENDING',
  'RECEIVED',
  'CANCELLED'
);

CREATE TYPE cadence_unit AS ENUM (
  'DAYS',
  'MONTHLY',
  'QUARTERLY',
  'HALF_YEARLY',
  'YEARLY'
);

CREATE TYPE expense_intent AS ENUM (
  'NECESSITY',
  'INVESTMENT',
  'DISCRETIONARY',
  'IMPULSE'
);

CREATE TYPE debt_status AS ENUM (
  'OUTSTANDING',
  'PARTIALLY_SETTLED',
  'SETTLED',
  'DEFAULTED'
);

CREATE TYPE budget_period AS ENUM (
  'MONTHLY',
  'QUARTERLY',
  'HALF_YEARLY',
  'ANNUAL'
);
```

### 1.2 Core Relational Tables

```sql
-- 1. Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(128) NOT NULL,
  default_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Accounts / Wallets (Primary Bank, UPI Pocket, Physical Cash)
CREATE TABLE accounts_or_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL,
  account_type VARCHAR(32) NOT NULL DEFAULT 'BANK', -- 'BANK', 'UPI', 'CASH', 'CREDIT'
  is_liquid BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Categories (Hierarchical with Parent-Child Relationships)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for system defaults
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(64) NOT NULL,
  icon VARCHAR(64),
  color VARCHAR(16),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  base_period budget_period NOT NULL DEFAULT 'MONTHLY',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_category_budget UNIQUE (user_id, category_id)
);

-- 5. Subscriptions & Irregular Recurring Outflows
CREATE TABLE subscriptions_recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES accounts_or_wallets(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name VARCHAR(128) NOT NULL,
  billing_amount NUMERIC(12, 2) NOT NULL CHECK (billing_amount > 0),
  cadence_unit cadence_unit NOT NULL DEFAULT 'DAYS',
  interval_days INTEGER NOT NULL CHECK (interval_days > 0),
  last_billed_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Debts Lent (Udhaar / Counterparty Receivables)
CREATE TABLE debts_lent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES accounts_or_wallets(id) ON DELETE RESTRICT,
  counterparty_name VARCHAR(128) NOT NULL,
  principal_amount NUMERIC(12, 2) NOT NULL CHECK (principal_amount > 0),
  date_lent DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status debt_status NOT NULL DEFAULT 'OUTSTANDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Debt Settlements (Partial / Full Repayments)
CREATE TABLE debt_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts_lent(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES accounts_or_wallets(id) ON DELETE RESTRICT,
  amount_returned NUMERIC(12, 2) NOT NULL CHECK (amount_returned > 0),
  date_returned DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Income Sources & Pipeline
CREATE TABLE income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES accounts_or_wallets(id) ON DELETE SET NULL,
  source_type VARCHAR(64) NOT NULL, -- 'SALARY', 'FREELANCE', 'INVESTMENT', 'GIFT'
  client_or_employer VARCHAR(128) NOT NULL,
  expected_amount NUMERIC(12, 2) NOT NULL CHECK (expected_amount > 0),
  due_date DATE NOT NULL,
  status income_status NOT NULL DEFAULT 'PENDING',
  received_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Transactions (The Master Ledger)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES accounts_or_wallets(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  intent expense_intent DEFAULT 'NECESSITY',
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_id UUID REFERENCES subscriptions_recurring(id) ON DELETE SET NULL,
  debt_id UUID REFERENCES debts_lent(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. High-Performance Indexing Strategy

Compound indexing prevents full-table sequential scans across dashboard metrics:

```sql
-- 1. Date-sorted user transaction queries (Dashboard feeds, monthly statements)
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

-- 2. Category aggregations (Category donut charts and monthly budget burn)
CREATE INDEX idx_transactions_category ON transactions(category_id);

-- 3. Wallet transaction lookups
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);

-- 4. User debt filtering by status (Active receivables widget)
CREATE INDEX idx_debts_user_status ON debts_lent(user_id, status);

-- 5. Subscriptions countdown sorting
CREATE INDEX idx_subscriptions_user_due ON subscriptions_recurring(user_id, next_due_date ASC);

-- 6. Income pipeline retrieval
CREATE INDEX idx_income_sources_user_status ON income_sources(user_id, status);
```

---

## 3. Atomic Transaction Directives

When dealing with financial state transitions, multiple tables must be modified within a single atomic boundary. Partial writes will corrupt asset integrity.

### 3.1 Debt Repayment Atomic Transaction Pattern
When logging a repayment of ₹$Y$ against a debt with principal $P$:

```sql
BEGIN;

-- 1. Record the settlement
INSERT INTO debt_settlements (debt_id, wallet_id, amount_returned, date_returned)
VALUES ($debt_id, $wallet_id, $amount_returned, CURRENT_DATE);

-- 2. Record the liquid inflow transaction
INSERT INTO transactions (user_id, wallet_id, type, amount, date, debt_id, notes)
VALUES ($user_id, $wallet_id, 'DEBT_REPAYMENT', $amount_returned, CURRENT_DATE, $debt_id, 'Repayment received');

-- 3. Calculate remaining balance and update status
WITH debt_calc AS (
  SELECT 
    d.principal_amount,
    COALESCE(SUM(s.amount_returned), 0) AS total_returned
  FROM debts_lent d
  LEFT JOIN debt_settlements s ON s.debt_id = d.id
  WHERE d.id = $debt_id
  GROUP BY d.principal_amount
)
UPDATE debts_lent
SET 
  status = CASE 
    WHEN debt_calc.total_returned >= debt_calc.principal_amount THEN 'SETTLED'::debt_status
    ELSE 'PARTIALLY_SETTLED'::debt_status
  END,
  updated_at = CURRENT_TIMESTAMP
FROM debt_calc
WHERE debts_lent.id = $debt_id;

COMMIT;
```

---

## 4. Neon MCP Interaction Guidelines

When executing database operations through the `mcp-server-neon` tool suite:

1. **Schema Migrations**:
   - Always run dry-run / schema comparisons or check table schemas first using `describe_table_schema` or `get_database_tables`.
   - Execute DDL commands using `run_sql`.
2. **Transaction Isolation**:
   - For multi-statement business logic (e.g., debt settlement + transaction log), use `run_sql_transaction` with explicit statements.
3. **Connection Pooling**:
   - For Next.js Serverless runtime, use `@neondatabase/serverless` with HTTP query pooling or WebSockets for optimal cold-start performance.
