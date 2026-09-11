# AutoFlow — Enterprise AI Automation Platform
## Smart Data Mapping, AI Data Bridge & 11-Phase Audit Trail

AutoFlow is an enterprise-grade, Zapier-style workflow automation platform monorepo engineered with Next.js 14, Node.js/Express, MongoDB Atlas, BullMQ worker queues, and an **AI Data Bridge** (Smart Data Mapping & Transformation Layer).

---

## 🌟 Key Features

- **Automated Data Bridge (App A → App B)**: Automatically passes, formats, coercively types, and sanitizes output from any connector to input for any target connector without custom mapping code.
- **Deterministic-First, AI-Assisted Mapping**:
  1. **Deterministic Matcher & Coercer** (Sub-millisecond speed for exact keys, labels, semantic roles & synonym groups)
  2. **In-Memory Transformation Cache** (High throughput)
  3. **AI Bridge LLM Provider** (Groq / Gemini fallback for complex/unstructured payloads)
  4. **Post-Bridge Validator & Sanitizer** (E.164 phone numbers, HTML stripping, whitespace trimming)
- **11-Phase Per-Step Execution Audit Trail**: Full inspection for every workflow run — raw input, resolved input, AI bridge decision source, coercions applied, confidence scores, HTTP calls, outputs, timing, and errors.
- **Zero-Code Connector Learning**: Add a new connector to `packages/connector-sdk` and run `npm run seed:field-catalog`. The system auto-detects semantic roles (cents ↔ dollars, unix timestamp ↔ ISO date, phone E.164) with zero code changes.
- **Sensitive Data Masking**: Bearer tokens, API keys, passwords, and credit card numbers are masked automatically before writing to logs or emitting Socket.IO events.

---

## 🏗️ Monorepo Structure

```
AUTOMATIONS
├── apps
│   ├── backend               # Express API backend & Socket.IO server (Port 5000)
│   ├── frontend              # Next.js 14 Dashboard & Workflow Builder UI (Port 3000)
│   ├── worker                # BullMQ background DAG execution engine
│   └── webhook               # Webhook listener gateway for external triggers
├── packages
│   ├── ai-data-bridge        # AI Data Bridge LLM prompt builder, parser, cache & validator
│   ├── data-mapper           # Deterministic TypeCoercer & SemanticFieldMatcher
│   ├── database              # Mongoose models & seed scripts for field catalog & coercions
│   ├── connector-sdk         # 70+ Built-in connector manifests, SDK & StepExecutor engine
│   └── shared-types          # Monorepo TypeScript interfaces & DAG schema definitions
├── docs
│   └── features              # Architectural documentation & seed strategies
└── scripts                   # System utility scripts
```

---

## 🚀 Quick Start Guide for New Developers

### 1. Prerequisites

Ensure you have the following installed locally or accessible via cloud:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/autoflow`) or MongoDB Atlas URI
- **Redis**: Local Redis (`redis://localhost:6379`) or Upstash Redis URL

---

### 2. Installation & Environment Setup

1. **Clone the repository and install dependencies**:
   ```bash
   git clone <repo-url>
   cd AUTOMATIONS
   npm install
   ```

2. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp env.example .env
   ```
   *Edit `.env` to set your `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, and optional `GEMINI_API_KEY` / `GROQ_API_KEY`.*

---

### 3. Database Seeding (Crucial First-Time Step!)

Before launching the app, run the **Smart Data Mapping Seeds**. This populates the `connector_field_catalog`, `connector_coercion_rules`, and `connector_synonym_groups` MongoDB collections from connector manifests:

```bash
# Seed all field catalogs, coercion rules, and synonym groups into MongoDB
npm run seed:all
```

**Individual Seed Commands**:
```bash
# Seed only the connector field catalog (reads all connector manifests)
npm run seed:field-catalog

# Seed universal coercion rules (cents ↔ dollars, unix timestamp ↔ ISO date)
npm run seed:coercion-rules

# Seed universal synonym groups (e.g. text/body/content -> message_content)
npm run seed:synonym-groups

# Seed a single connector (e.g., when adding a new integration)
npm run seed:field-catalog -- --connector=gmail
```

---

### 4. Running the Development Server

Start all microservices and frontend concurrently with TurboRepo:

```bash
npm run dev
```

- **Frontend UI**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **API Base Route**: `http://localhost:5000/api/v1`

---

## 📖 How the AI Data Bridge & Data Mapper Work

When Step N completes (e.g., Stripe `new_charge`), the output is automatically passed to Step N+1 (e.g., QuickBooks `create_invoice` or Gmail `send_email`).

```
Step A Output (Stripe Charge)
  amount: 4999 (integer cents)
  customerEmail: "john@example.com"
  created: 1700000000 (unix timestamp)
       │
       ▼
 ┌──────────────────────────────────────────────────────────┐
 │                  AI DATA BRIDGE ENGINE                   │
 │ 1. Query MongoDB connector_field_catalog                 │
 │ 2. SemanticFieldMatcher (matches email, amount, timestamp)│
 │ 3. TypeCoercer (converts cents 4999 → $49.99 dollars)   │
 │ 4. Sanitizer (trims whitespace, masks sensitive values)  │
 └──────────────────────────────────────────────────────────┘
       │
       ▼
Step B Input (Target Connector Payload)
  amount: 49.99
  to: "john@example.com"
```

---

## 🛠️ Adding a New Connector (Zero Mapping Code)

Adding a new connector to AutoFlow requires **zero data mapping code**:

1. Create your connector manifest under `packages/connector-sdk/src/integrations/<connector-name>/manifest.ts`.
2. Register the connector in `packages/connector-sdk/src/index.ts`.
3. Run the field catalog seed:
   ```bash
   npm run seed:field-catalog -- --connector=<connector-name>
   ```
4. **Done!** The AI Data Bridge automatically learns your connector's input/output fields, semantic roles, and coercions.

---

## 📊 Live Monitoring & Execution Inspector

Navigate to `http://localhost:3000/executions` in your browser to inspect workflow runs in real-time:
- **Live Worker Queue**: Active BullMQ job metrics & MongoDB Atlas execution count.
- **AI Bridge & Coercions Inspector**: View exact mapping source (`DETERMINISTIC`, `CACHE_HIT`, `AI_GENERATED`), confidence scores, and type coercions applied.
- **Full 11-Phase Audit Log**: Inspect step input/output JSON, HTTP status codes, and error stack traces.

---

## 🧪 Testing & Verification

```bash
# Compile all workspace packages
npm run build

# Run unit & integration test runner
npm test
```
