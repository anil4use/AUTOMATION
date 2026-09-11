# AutoFlow — Seed Strategy
## How Connector Field Knowledge Gets Into MongoDB

> This document explains how `connector_field_catalog`, `connector_coercion_rules`, and `connector_synonym_groups` are populated — and how to add new connectors with zero code changes.

---

## The Core Idea

Instead of hardcoding field roles in TypeScript, we **auto-detect** them from connector manifests using pattern rules, then store them in MongoDB. The AI Bridge reads from MongoDB at runtime.

```
Connector Manifest (TypeScript)
        │
        ▼
  Seed Script (reads manifests → applies pattern rules)
        │
        ▼
  MongoDB: connector_field_catalog
        │
        ▼
  AI Data Bridge (queries DB at runtime)
```

**Result:** Adding a new connector = run one command. No TypeScript changes needed.

---

## Seed Scripts

### Location
```
packages/database/src/seeds/
├── seed-field-catalog.ts      ← main seed: reads manifests, writes connector_field_catalog
├── seed-coercion-rules.ts     ← seeds connector_coercion_rules (runs once, universal)
├── seed-synonym-groups.ts     ← seeds connector_synonym_groups (runs once, universal)
└── pattern-rules.ts           ← auto-detection rules used by seed-field-catalog
```

### Commands
```bash
# Seed everything (first-time setup)
npm run seed:all

# Seed only the field catalog (after adding/updating a connector)
npm run seed:field-catalog

# Seed a single connector
npm run seed:field-catalog -- --connector=gmail

# Seed coercion rules (universal — only run when rules change)
npm run seed:coercion-rules

# Seed synonym groups (universal — only run when groups change)
npm run seed:synonym-groups

# Dry run — see what would be seeded without writing to DB
npm run seed:field-catalog -- --dry-run

# Force re-seed (overwrite existing entries)
npm run seed:field-catalog -- --force
```

---

## How `seed-field-catalog.ts` Works

```typescript
// packages/database/src/seeds/seed-field-catalog.ts

import { manifestRegistry } from '@automation/connector-sdk';
import { ConnectorFieldCatalogModel } from '../models/connector-field-catalog.model';
import { PATTERN_RULES } from './pattern-rules';

async function seedFieldCatalog(options: { connector?: string; force?: boolean; dryRun?: boolean }) {
  // 1. Get all connector manifests
  const manifests = manifestRegistry.getAll();                     // or filter by --connector
  
  const docs: ConnectorFieldCatalogEntry[] = [];

  for (const manifest of manifests) {
    // 2. Process triggers
    for (const trigger of manifest.triggers) {
      for (const field of trigger.outputs) {
        docs.push(buildCatalogEntry(manifest.id, trigger.id, 'trigger', 'output', field));
      }
      for (const field of trigger.inputs) {
        docs.push(buildCatalogEntry(manifest.id, trigger.id, 'trigger', 'input', field));
      }
    }
    
    // 3. Process actions
    for (const action of manifest.actions) {
      for (const field of action.inputs) {
        docs.push(buildCatalogEntry(manifest.id, action.id, 'action', 'input', field));
      }
      for (const field of action.outputs) {
        docs.push(buildCatalogEntry(manifest.id, action.id, 'action', 'output', field));
      }
    }
  }

  if (options.dryRun) {
    console.table(docs);
    return;
  }

  // 4. Upsert to MongoDB (safe to re-run)
  for (const doc of docs) {
    await ConnectorFieldCatalogModel.findOneAndUpdate(
      { connectorId: doc.connectorId, operationId: doc.operationId, direction: doc.direction, fieldKey: doc.fieldKey },
      { $set: { ...doc, updatedAt: new Date() } },
      { upsert: true, new: true }
    );
  }

  console.log(`✅ Seeded ${docs.length} field catalog entries`);
}

function buildCatalogEntry(connectorId, operationId, operationType, direction, field) {
  // Apply pattern rules to auto-detect semanticRole and format
  const detected = PATTERN_RULES.detect(connectorId, field.key, field.label, field.type);
  
  return {
    connectorId,
    operationId,
    operationType,
    direction,
    fieldKey:    field.key,
    fieldLabel:  field.label,
    fieldType:   field.type,
    required:    field.required,
    // Use manifest's semanticRole if already set, otherwise use auto-detected
    semanticRole: field.semanticRole || detected.role,
    format:       field.format || detected.format,
    synonyms:    detected.synonyms,
    transformHints: detected.hints,
    notes:       detected.notes,
    autoDetected: !field.semanticRole,   // true if we had to guess
    confidence:  detected.confidence,
    version:     '2.0.0',
    enabled:     true,
  };
}
```

---

## Pattern Rules (`pattern-rules.ts`)

The auto-detection rules — applied to every field key + label during seeding:

```typescript
// packages/database/src/seeds/pattern-rules.ts

export const PATTERN_RULES = {
  detect(connectorId: string, fieldKey: string, fieldLabel: string, fieldType: string): DetectedRoles {
    const key = fieldKey.toLowerCase();
    const label = fieldLabel.toLowerCase();

    // ── Email ─────────────────────────────────────────
    if (/email|e.?mail/.test(key) || /email/.test(label)) {
      return { role: 'email_address', format: 'email', confidence: 0.95,
               synonyms: ['email', 'from', 'to', 'sender', 'recipient'],
               hints: ['extract_email_from_name_format'], notes: '' };
    }

    // ── Phone ─────────────────────────────────────────
    if (/phone|mobile|tel(?:ephone)?|whatsapp|sms/.test(key)) {
      const requiresE164 = ['whatsapp', 'twilio', 'vonage', 'messagebird'].includes(connectorId);
      return { role: 'phone_number', format: requiresE164 ? 'phone_e164' : null,
               confidence: 0.90, synonyms: ['phone', 'mobile', 'tel'],
               hints: requiresE164 ? ['normalize_to_e164'] : [],
               notes: requiresE164 ? `${connectorId} REQUIRES E.164 format` : '' };
    }

    // ── Timestamp ─────────────────────────────────────
    if (/^(created|updated|date|timestamp|time|at|sent|received)/.test(key) || 
        /(at|date|time|timestamp)$/.test(key)) {
      // Stripe, PayPal use unix seconds for their timestamps
      const usesUnix = ['stripe', 'paypal', 'braintree'].includes(connectorId);
      return { role: 'timestamp',
               format: usesUnix ? 'unix_timestamp' : 'iso_date',
               confidence: 0.88, synonyms: ['date', 'createdAt', 'timestamp', 'time'],
               hints: usesUnix ? ['unix_to_iso_date'] : [],
               notes: usesUnix ? `${connectorId} outputs unix seconds, not ISO date` : '' };
    }

    // ── Money Amount ───────────────────────────────────
    if (/^(amount|price|total|cost|fee|charge|revenue|value)/.test(key) ||
        /(amount|price|total|cost)$/.test(key)) {
      // Stripe always outputs cents (integer)
      const usesCents = ['stripe', 'braintree'].includes(connectorId);
      return { role: 'amount_money',
               format: usesCents ? 'currency_cents' : 'currency_dollars',
               confidence: 0.85, synonyms: ['amount', 'price', 'total', 'value'],
               hints: usesCents ? ['cents_to_dollars_required'] : [],
               notes: usesCents ? `${connectorId} outputs amounts as INTEGER CENTS` : '' };
    }

    // ── Message / Body Content ─────────────────────────
    if (/^(text|body|content|message|msg|description|note|comment|prompt|result|summary)/.test(key)) {
      const isHtml = /html/i.test(key) || /html/i.test(label);
      return { role: 'message_content',
               format: isHtml ? 'html' : null,
               confidence: 0.90, synonyms: ['text', 'body', 'content', 'message', 'description'],
               hints: isHtml ? ['strip_html_tags'] : [],
               notes: '' };
    }

    // ── Title / Subject ───────────────────────────────
    if (/^(subject|title|name|summary|headline|dealname|issuetitle|taskname|topic)/.test(key)) {
      return { role: 'title_subject', format: null, confidence: 0.85,
               synonyms: ['subject', 'title', 'name', 'summary', 'headline'],
               hints: [], notes: '' };
    }

    // ── URL ────────────────────────────────────────────
    if (/url|link|href|website|domain/.test(key)) {
      return { role: 'url_link', format: 'url', confidence: 0.90,
               synonyms: ['url', 'link', 'href', 'website'],
               hints: ['ensure_https_scheme'], notes: '' };
    }

    // ── Currency Code ──────────────────────────────────
    if (/^currency$/.test(key) || /currency.?code/.test(key)) {
      return { role: 'currency_code', format: null, confidence: 0.95,
               synonyms: ['currency', 'currencyCode', 'iso_currency'],
               hints: ['uppercase_iso4217'], notes: 'Should be ISO 4217 code: USD, EUR, INR' };
    }

    // ── System ID ─────────────────────────────────────
    if (/^(id|_id|uid|guid|uuid)$/.test(key) || /(Id|_id)$/.test(fieldKey)) {
      return { role: 'unique_id', format: null, confidence: 0.80,
               synonyms: ['id', 'uid', 'objectId'],
               hints: ['do_not_map_cross_connector'],
               notes: 'System IDs are connector-specific — usually should NOT be mapped to another connector' };
    }

    // ── Status ────────────────────────────────────────
    if (/^(status|state|stage|phase|type)$/.test(key)) {
      return { role: 'status', format: null, confidence: 0.75,
               synonyms: ['status', 'state', 'stage'],
               hints: [], notes: 'Enum values differ between connectors — AI should map semantically' };
    }

    // ── First Name / Last Name ─────────────────────────
    if (/first.?name|fname/.test(key)) {
      return { role: 'first_name', format: null, confidence: 0.95, synonyms: ['firstName', 'fname', 'givenName'], hints: [], notes: '' };
    }
    if (/last.?name|lname|surname/.test(key)) {
      return { role: 'last_name', format: null, confidence: 0.95, synonyms: ['lastName', 'lname', 'surname'], hints: [], notes: '' };
    }
    if (/full.?name|customer.?name|contact.?name/.test(key)) {
      return { role: 'full_name', format: null, confidence: 0.90,
               synonyms: ['fullName', 'customerName', 'name'],
               hints: ['may_need_split_to_first_last'], notes: '' };
    }

    // ── No match ─────────────────────────────────────
    return { role: null, format: null, confidence: 0, synonyms: [], hints: [], notes: 'Could not auto-detect role' };
  }
};
```

---

## Adding a New Connector — Zero Code Workflow

```
1. Developer writes connector manifest (TypeScript class, already existing process)
   → Connector has inputs[] and outputs[] with key, label, type, required

2. Developer registers connector in manifestRegistry (already existing process)
   → connectorRegistry['my-new-app'] = new MyNewAppConnector()

3. Developer runs ONE command:
   $ npm run seed:field-catalog -- --connector=my-new-app
   
   → Script reads manifest
   → Applies pattern rules to auto-detect semantic roles
   → Upserts to connector_field_catalog in MongoDB
   → Done ✅

4. (Optional) Developer reviews auto-detected entries via Admin API:
   GET /api/v1/admin/field-catalog?connectorId=my-new-app
   
   → If any field was misdetected, update via:
   PATCH /api/v1/admin/field-catalog/:id
   { "semanticRole": "correct_role", "format": "correct_format" }

5. No code changes to AI Bridge, TypeCoercer, or MappingEngine
   → They all read from MongoDB at runtime
   → New connector works immediately
```

---

## Improving Detection Quality

For connectors where auto-detection gets it wrong, the developer can:

**Option A: Add `semanticRole` + `format` to the manifest directly:**
```typescript
// In the connector manifest:
inputs: [
  {
    key: 'amount',
    label: 'Charge Amount',
    type: 'number',
    required: true,
    semanticRole: 'amount_money',  // ← explicit, no guessing
    format: 'currency_cents',       // ← explicit
    description: 'Amount in cents (e.g. 4999 = $49.99)'
  }
]
```
The seed script sees these explicit values and uses them with `confidence: 1.0` and `autoDetected: false`.

**Option B: Override via Admin API after seeding:**
```http
PATCH /api/v1/admin/field-catalog/:id
{
  "semanticRole": "amount_money",
  "format": "currency_cents",
  "notes": "Stripe ALWAYS outputs cents as integer",
  "transformHints": ["cents_to_dollars_required"]
}
```

---

## Coercion Rules Seed Data

Coercion rules are **universal** — they don't change per connector. They are seeded once:

```typescript
// packages/database/src/seeds/seed-coercion-rules.ts
// Static seed data — edit this file to add new coercion rules
// Then run: npm run seed:coercion-rules

export const COERCION_RULES_SEED = [
  {
    sourceRole: 'amount_money', sourceFormat: 'currency_cents',
    targetRole: 'amount_money', targetFormat: 'currency_dollars',
    coercionMethod: 'divide_by_100',
    name: 'Cents to Dollars',
    example: { input: 4999, output: '49.99' },
    priority: 10,
  },
  {
    sourceRole: 'timestamp', sourceFormat: 'unix_timestamp',
    targetRole: 'timestamp', targetFormat: 'iso_date',
    coercionMethod: 'unix_seconds_to_iso',
    name: 'Unix Seconds to ISO Date',
    example: { input: 1699900000, output: '2023-11-13T12:26:40.000Z' },
    priority: 10,
  },
  // ... (see full list in 11_database_collections.md)
];
```

---

## Synonym Groups Seed Data

Synonym groups are also **universal**. Edit once, all connectors benefit:

```typescript
// packages/database/src/seeds/seed-synonym-groups.ts
export const SYNONYM_GROUPS_SEED = [
  {
    groupName: 'message_content',
    semanticRole: 'message_content',
    synonyms: ['text', 'body', 'content', 'message', 'message_text', 'bodyPlain', 'description', 'prompt', 'result'],
  },
  // ... (see full list in 11_database_collections.md)
];
```
