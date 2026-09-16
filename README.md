# Conversational Banking Analyst

A full-stack app where a user asks banking business questions in natural language and gets back
validated SQL, tabular results, and visualizations (KPI cards, bar charts, line charts, tables).

## Project structure

```
backend/            Node.js + TypeScript API
  src/
    db/
      index.ts      SQLite connection (better-sqlite3)
      seed.ts        Schema definition + synthetic data seeding
    services/
      aiService.ts        Mocked NLP -> SQL translation
      queryValidator.ts    Input sanitization + SQL allow-list validation
    index.ts         Express app / /api/chat endpoint
  tests/
    validator.test.ts

frontend/            React + TypeScript (Vite) chat UI
  src/
    App.tsx           Chat interface, KPI cards, charts (recharts), data table
```

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts, lucide-react icons
- **Backend:** Node.js, TypeScript, Express 5, better-sqlite3 (SQLite)
- **AI:** Mocked NLP-to-SQL service (regex-pattern intent matcher), no external LLM dependency
- **Testing:** Vitest

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed     # creates banking.db and seeds synthetic data
npm start        # starts API on http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # starts Vite dev server on http://localhost:5173
```

### Tests

```bash
cd backend
npm test
```

## Environment variables

See [backend/.env.example](backend/.env.example):

- `PORT` — API port (default `3000`)
- `NODE_ENV` — runtime environment

## Database schema & seed data

Two logically distinct, related datasets (see [backend/src/db/seed.ts](backend/src/db/seed.ts)):

- **customers** — `id, name, branch, risk_rating, joined_date`. Branch and risk rating are
  constrained via SQL `CHECK` constraints.
- **transactions** — `id, customer_id, amount, type (CREDIT/DEBIT), category, transaction_date`,
  foreign-keyed to `customers` with `ON DELETE CASCADE`.

12 synthetic customers and 50 synthetic transactions are generated deterministically on seed.

## Architecture & flow

1. User types a question in the chat UI ([frontend/src/App.tsx](frontend/src/App.tsx)) and it is
   POSTed to `POST /api/chat`.
2. The backend first checks the raw user input for SQL-like content
   (`containsUnsafeSqlInput`) and rejects it — the endpoint only accepts natural language,
   never raw SQL from the client.
3. `parseQuestionToSql` (a mocked "AI" service) matches the question against a set of known
   banking intents (branch totals, top spenders, risk breakdown, monthly trends, transaction
   totals) and returns a **hard-coded, parameterization-free SELECT statement** plus a
   visualization hint (`kpi | bar | line | table`). Unmatched questions fall back to a safe
   default aggregate query — the service never string-concatenates user input into SQL.
4. Before execution, the generated SQL is passed through `validateQuery`, which:
   - requires the statement to start with `SELECT`
   - blocks `;`, comments, and mutating keywords (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`,
     `CREATE`, `PRAGMA`, etc.)
5. Only after passing validation is the query executed via `db.prepare(sql).all()` against the
   read-only-by-convention SQLite database.
6. Results are returned with the SQL used and a visualization type, and the frontend renders the
   response as KPI cards, a bar/line chart (Recharts), or a sortable/filterable table.

## Assumptions

- Since no real LLM key was required, natural-language understanding is mocked via
  regex-based intent matching rather than a live LLM call. This keeps the exercise fully
  offline/deterministic while demonstrating the same validation boundary a real LLM integration
  would need (generated SQL is never trusted or executed without checks).
- SQLite was chosen over Postgres/MySQL for zero-setup local development within the time-boxed
  session; the schema and query layer are portable to Postgres/MySQL with minor driver changes.
- Because the SQL comes from a fixed set of vetted templates (not free-form LLM generation), the
  validator's job is to guarantee the *never-changing contract* (SELECT-only, no chaining) rather
  than to sanitize arbitrary generated SQL — in a real LLM-backed version this same validator
  would be the last line of defense against injected/mutating statements.

## Completed functionality

- Natural-language chat interface with suggested prompts
- 5 supported banking intents (branch totals, top spenders, risk breakdown, monthly trends,
  transaction totals) with graceful fallback
- KPI cards, bar chart, line chart, and sortable/filterable table visualizations
- Input validation (empty/non-string rejection, raw-SQL rejection) and error handling
  (network errors, execution errors) surfaced in the UI
- SQL allow-list validation before every query execution
- One automated test suite covering the validator's mutation-blocking and raw-input-blocking
  behavior

## Known limitations

- The "AI" layer is a fixed set of regex-matched query templates, not a real LLM — it cannot
  generalize to arbitrary phrasing or ad-hoc joins/filters outside the five supported intents.
- No authentication/authorization — anyone with API access can query all data.
- No pagination/row limits on generated queries beyond what's hard-coded per template.
- No parameterized filters (e.g., date ranges, specific customer names) from the chat input.
- SQLite file-based DB is not suitable for concurrent multi-user production load.

## Productionisation approach

- Replace the mocked intent matcher with a real LLM call constrained to a fixed schema
  (system prompt with table/column allow-list), and keep (or strengthen) the existing
  `validateQuery` layer as a mandatory server-side gate — never trust LLM output directly.
- Move to Postgres/MySQL with connection pooling, read replicas for analytics load, and a
  dedicated read-only DB role/user for the query-execution path (defense in depth beyond
  the app-level validator).
- Add authentication (e.g., JWT/session) and per-user/row-level access control appropriate for
  banking data.
- Add request rate limiting, structured logging/audit trail of every generated SQL query and
  who ran it (important for banking compliance), and centralized error monitoring.
- Add pagination and query timeouts/row-count caps to protect against expensive queries.
- Expand automated test coverage to integration tests for `/api/chat` and frontend component
  tests.
