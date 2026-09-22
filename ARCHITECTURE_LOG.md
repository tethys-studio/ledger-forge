# Architectural Memory & Decision Log

This document records the foundational architectural decisions, schema modifications, security contracts, and module boundaries for LedgerForge.

---

## [2026-09-22] - Production-Grade Better Auth Subsystem with Neon PostgreSQL
*Date: 2026-09-22 | Scope: Database | Authentication | API Contracts | Route Protection*

### 1. Architectural Context & Objectives
To transition LedgerForge from static demonstration state (`DEFAULT_USER_ID`) to a hardened multi-tenant application, Better Auth was provisioned with Neon PostgreSQL connection pooling.

### 2. Database Schema (Neon PostgreSQL v16+)
Provisioned standard Better Auth tables in the `public` schema with `UUID` primary keys to match the existing domain models:

#### Table: `public."user"`
- `id`: UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
- `name`: TEXT NOT NULL
- `email`: TEXT NOT NULL UNIQUE
- `"emailVerified"`: BOOLEAN NOT NULL DEFAULT FALSE
- `image`: TEXT
- `"createdAt"`: TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
- `"updatedAt"`: TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

#### Table: `public."session"`
- `id`: UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
- `"expiresAt"`: TIMESTAMPTZ NOT NULL
- `token`: TEXT NOT NULL UNIQUE (Indexed: `idx_session_token`)
- `"createdAt"`: TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
- `"updatedAt"`: TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
- `"ipAddress"`: TEXT
- `"userAgent"`: TEXT
- `"userId"`: UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE (Indexed: `idx_session_userId`)

#### Table: `public."account"`
- `id`: UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
- `"accountId"`: TEXT NOT NULL
- `"providerId"`: TEXT NOT NULL
- `"userId"`: UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE (Indexed: `idx_account_userId`)
- `"accessToken"`: TEXT
- `"refreshToken"`: TEXT
- `"idToken"`: TEXT
- `"accessTokenExpiresAt"`: TIMESTAMPTZ
- `"refreshTokenExpiresAt"`: TIMESTAMPTZ
- `scope`: TEXT
- `password`: TEXT
- `"createdAt"`: TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
- `"updatedAt"`: TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

#### Table: `public."verification"`
- `id`: UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
- `identifier`: TEXT NOT NULL (Indexed: `idx_verification_identifier`)
- `value`: TEXT NOT NULL
- `"expiresAt"`: TIMESTAMPTZ NOT NULL
- `"createdAt"`: TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
- `"updatedAt"`: TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

#### Foreign Key Relinking & Multi-Tenant Cascade
All 7 core domain tables were updated to strictly reference `public."user"(id)` with `ON DELETE CASCADE`:
- `accounts_or_wallets.user_id` -> `public."user"(id) ON DELETE CASCADE`
- `categories.user_id` -> `public."user"(id) ON DELETE CASCADE` (nullable for system defaults)
- `budgets.user_id` -> `public."user"(id) ON DELETE CASCADE`
- `subscriptions_recurring.user_id` -> `public."user"(id) ON DELETE CASCADE`
- `debts_lent.user_id` -> `public."user"(id) ON DELETE CASCADE`
- `income_sources.user_id` -> `public."user"(id) ON DELETE CASCADE`
- `transactions.user_id` -> `public."user"(id) ON DELETE CASCADE`

### 3. Server-Side Security Invariants & API Contracts
- **Server Actions Session Check**: Replaced `DEFAULT_USER_ID` in `src/lib/actions.ts` with `const user = await getAuthenticatedUser(); const userId = user.id;`. All mutations strictly derive tenant ID from the verified cookie token.
- **Server Components Protection**: All pages (`/`, `/wallets`, `/transactions`, `/income`, `/debts`, `/subscriptions`) call `getServerSession()`, verifying active sessions on server render before fetching tenant data.
- **Next.js Middleware (`src/middleware.ts`)**: Fast edge-level session cookie validation. Redirects unauthenticated traffic to `/login`. Redirects authenticated sessions away from `/login` and `/signup` to `/`.
- **Onboarding Hook (`databaseHooks.user.create.after`)**: Upon user creation, automatically seeds an initial liquid "Primary Bank" wallet and complete hierarchical category taxonomy (Necessities, Groceries, Food, Outings, Tech, Personal Care, Impulses).

### 4. Auth Pages
- `/login`: Obsidian dark neo-fintech card with Google OAuth single-tap handshake and email/password form with visibility toggle.
- `/signup`: Obsidian dark neo-fintech card with Google OAuth, real-time password length and match checks, and automatic post-signup category initialization.
