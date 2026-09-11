# AutoFlow — Smart Data Mapping & AI Bridge System
## Architecture & Design Document

> **Version:** 1.0.0 | **Status:** In Development

---

## 1. The Problem We're Solving

Today, AutoFlow connects 70+ apps. When a user builds a workflow like:

```
Stripe → HubSpot → Gmail → Slack
```

They must **manually write field mappings** for every step:

```typescript
// What users do TODAY (manual, error-prone):
fieldMapping: {
  "to":      "{{trigger.customerEmail}}",
  "subject": "Order {{nodes.step_1.output.orderId}}",
  "body":    "{{nodes.step_1.output.customerName}} paid {{nodes.step_1.output.amount}}"
}
```

**Real problems discovered across 70+ connectors:**
- Stripe outputs `amount` in **cents** (4999) but HubSpot expects **dollars** ("49.99")
- Stripe outputs `created` as a **unix timestamp** but Google Calendar needs **ISO date string**
- `Gmail.from` contains `"John Doe <john@example.com>"` but WhatsApp needs just `"+14155552671"` (E.164)
- `bodyPlain`, `text`, `content`, `message_text`, `description` all mean the same thing across connectors
- `firstName` + `lastName` vs `fullName` vs `customerName` — all the same concept, different shapes

**The goal: The system automatically understands, transforms, and routes data between every app with zero manual mapping.**

---

## 2. Core Design Principle: Database-Driven, Never Static Code

> ⚠️ **Critical Rule:** Field roles, coercion rules, synonym groups are NEVER hardcoded TypeScript constants. They live in MongoDB collections seeded from manifests.

### Why This Matters

| Static Code Approach ❌ | Database-Driven Approach ✅ |
|---|---|
| 1 new connector = code change + PR + deploy | 1 new connector = run seed script |
| 1000 connectors = 3000+ lines of TS constants | 1000 connectors = 1000 MongoDB documents |
| Update field role = full release cycle | Admin API to update live with no deploy |
| No community/user-added connectors | Any manifest → auto-seed → works instantly |
| Build-time knowledge only | Runtime knowledge, always fresh |

---

## 3. System Overview

```
Trigger Node → [AI DATA BRIDGE] → Action Node → [AI DATA BRIDGE] → Action Node → …
                      ↑
         ┌────────────┴────────────┐
         │   MongoDB Knowledge Base │
         │   (4 collections)        │
         └────────────┬────────────┘
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
 connector_field_  connector_     connector_
    catalog       coercion_rules  synonym_groups
 (who is what)   (how to convert) (what's the same)
```

### Runtime Flow (Every Step Boundary)

```
Step N Output Data
       │
       ▼
 [1] Query connector_field_catalog → get semantic roles for all fields
       │
       ▼
 [2] Query connector_coercion_rules → find applicable type conversions
       │
       ▼
 [3] Query connector_synonym_groups → build synonym map for this pair
       │
       ▼
 [4] Build AI prompt (< 800 tokens) with full context
       │
       ▼
 [5] Call Groq Llama 3.3 → ~280ms → returns perfect JSON for next step
       │
       ▼
 [6] Post-AI Safety: TypeCoercer → Sanitizer → Validator
       │
       ▼
 [7] Log all phases to execution_logs
       │
       ▼
 Perfect Input → Step N+1 Connector
```

---

## 4. Collections Overview

Full schemas in [`11_database_collections.md`](./11_database_collections.md)

| Collection | Purpose | Size (70 connectors) | Size (1000 connectors) |
|---|---|---|---|
| `connector_field_catalog` | Semantic role + format for every (connector, operation, field) | ~1,200 docs | ~15,000+ docs |
| `connector_coercion_rules` | Type conversion rules stored as data, not code | ~25 docs | ~25 docs (rules are universal) |
| `connector_synonym_groups` | Field name synonym groups per semantic role | ~20 docs | ~20 docs (groups are universal) |
| `execution_logs` | Full 11-phase per-step execution logs | grows daily | grows daily |

---

## 5. Seeding

Full guide in [`12_seed_strategy.md`](./12_seed_strategy.md)

```bash
# Seed field catalog for all registered connectors
npm run seed:field-catalog

# Seed coercion rules (universal — only needs to run once)
npm run seed:coercion-rules

# Seed synonym groups (universal — only needs to run once)
npm run seed:synonym-groups

# Seed a single connector after adding it
npm run seed:field-catalog -- --connector=my-new-app
```

**Auto-detection logic:** The seed script reads connector manifests and applies pattern rules to auto-detect semantic roles:
- Field key contains `email` → `email_address` role
- Field key contains `phone`, `mobile`, `whatsapp` → `phone_number` role
- Field key contains `subject`, `title`, `summary`, `headline` → `title_subject` role
- Field key is `amount`, `price`, `total`, `cost`, `charge` → `amount_money` role
- Field key is `created`, `date`, `timestamp`, `at`, `time` → `timestamp` role
- etc.

Admin can always override via API after auto-seed.

---

## 6. Components

| Component | Package | Description |
|---|---|---|
| **AI Data Bridge** | `packages/ai-data-bridge/` | Runtime AI transformer between every step |
| **Deterministic Safety Layer** | `packages/data-mapper/` | TypeCoercer, Sanitizer, Validator using DB rules |
| **Execution Logger** | `apps/backend/src/services/` | Structured 11-phase per-step logging |
| **Manifest Annotator** | `packages/connector-sdk/` | Auto-seeds field catalog on connector registration |
| **Bridge Admin API** | `apps/backend/src/modules/bridge/` | CRUD for field catalog, coercion rules, synonyms |

---

## 7. Document Index

| # | File | Topic |
|---|---|---|
| 10 | `10_smart_mapping_architecture.md` | **This file** — system overview |
| 11 | `11_database_collections.md` | MongoDB schemas for all 4 collections |
| 12 | `12_seed_strategy.md` | Seeding guide + pattern rules + admin API |
| 13 | `13_ai_data_bridge.md` | AI bridge design, prompt format, caching, fallback |
| 14 | `14_deterministic_layer.md` | TypeCoercer, SemanticMatcher, Sanitizer, Validator |
| 15 | `15_execution_logging.md` | What gets logged, API, frontend UI |
| 16 | `16_connector_developer_guide.md` | How to add a new connector (zero code for mapping) |
