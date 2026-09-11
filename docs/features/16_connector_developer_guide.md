# AutoFlow — Connector Developer Guide
## How to Add a New Connector with Zero Mapping Code

> When you add a new connector to AutoFlow, the AI Data Bridge automatically works with it.
> You write ZERO mapping logic. The system learns your connector from its manifest.

---

## Step-by-Step Guide

### Step 1: Write the Connector Class (existing process, no change)

```typescript
// packages/connector-sdk/src/integrations/my-new-app/index.ts

import { BaseConnector } from '../../core/base-connector';
import { ConnectorManifest } from '@automation/shared-types';

export const myNewAppManifest: ConnectorManifest = {
  id: 'my-new-app',
  name: 'My New App',
  description: 'Description of what this app does',
  category: 'CRM',
  icon: '/icons/my-new-app.svg',
  authType: 'oauth2',
  triggers: [],
  actions: [
    {
      id: 'create_contact',
      name: 'Create Contact',
      description: 'Creates a new contact in My New App',
      type: 'action',
      inputs: [
        {
          key: 'email',
          label: 'Contact Email Address',
          type: 'string',
          required: true,
          // ✅ RECOMMENDED: Add semanticRole and format for best auto-mapping accuracy
          // If you skip these, the seed script will auto-detect them from field key patterns
          semanticRole: 'email_address',
          format: 'email',
        },
        {
          key: 'fullName',
          label: 'Full Name',
          type: 'string',
          required: false,
          semanticRole: 'full_name',   // ← optional but helps AI bridge
        },
        {
          key: 'phone',
          label: 'Phone Number (E.164)',
          type: 'string',
          required: false,
          semanticRole: 'phone_number',
          format: 'phone_e164',  // ← tells bridge this field REQUIRES E.164 format
        },
      ],
      outputs: [
        {
          key: 'contactId',
          label: 'Created Contact ID',
          type: 'string',
          required: true,
          semanticRole: 'unique_id',
        },
        {
          key: 'email',
          label: 'Contact Email',
          type: 'string',
          required: true,
          semanticRole: 'email_address',
          format: 'email',
        },
      ],
    },
  ],
};

export class MyNewAppConnector extends BaseConnector {
  manifest = myNewAppManifest;
  
  async executeAction(actionId, context) {
    // ... your connector logic
  }
}
```

### Step 2: Register the Connector (existing process, no change)

```typescript
// packages/connector-sdk/src/engine/step-executor.ts
// Add to the connectorRegistry object:

import { MyNewAppConnector } from '../integrations/my-new-app';

const connectorRegistry = {
  // ... existing connectors
  'my-new-app': new MyNewAppConnector(),
};
```

### Step 3: Run the Seed Script (NEW — one command)

```bash
npm run seed:field-catalog -- --connector=my-new-app
```

**That's it. Your connector now works with the AI Data Bridge.**

---

## What the Seed Script Does for You

When you run the seed, it:

1. **Reads your manifest** — all `inputs[]` and `outputs[]` fields
2. **Uses your explicit `semanticRole`/`format`** if you set them (best accuracy)
3. **Auto-detects roles** from field key patterns if you didn't set them:
   - `email` key → `email_address` role, `email` format
   - `phone` key → `phone_number` role
   - `amount` key + your connector is `stripe` → `currency_cents` format
   - `createdAt` key → `timestamp` role
4. **Writes to `connector_field_catalog` in MongoDB**

After seeding, when a user connects `stripe → my-new-app`, the AI Bridge:
- Knows Stripe's `customerEmail` is an `email_address`
- Knows your connector's `email` field is also an `email_address`
- Maps them automatically, extracting plain email from "Name <email>" format if needed

---

## Reviewing Auto-Detected Entries

After seeding, review what was detected:

```bash
# See what was detected (dry run before actual seed)
npm run seed:field-catalog -- --connector=my-new-app --dry-run

# Via Admin API (after seeding)
GET /api/v1/admin/field-catalog?connectorId=my-new-app
```

**Response example:**
```json
[
  {
    "_id": "...",
    "connectorId": "my-new-app",
    "operationId": "create_contact",
    "direction": "input",
    "fieldKey": "email",
    "semanticRole": "email_address",
    "format": "email",
    "autoDetected": false,   ← you set this explicitly in manifest ✅
    "confidence": 1.0
  },
  {
    "_id": "...",
    "connectorId": "my-new-app",
    "operationId": "create_contact",
    "direction": "input",
    "fieldKey": "fullName",
    "semanticRole": "full_name",
    "format": null,
    "autoDetected": false,   ← you set this explicitly ✅
    "confidence": 1.0
  }
]
```

If any field was **misdetected** (`autoDetected: true` + wrong role), update via API:

```bash
curl -X PATCH /api/v1/admin/field-catalog/{id} \
  -H "Authorization: Bearer ..." \
  -d '{
    "semanticRole": "correct_role",
    "format": "correct_format",
    "notes": "Reason for this role"
  }'
```

---

## Best Practices for Connector Authors

### ✅ DO

```typescript
// Set semanticRole and format on fields with non-obvious meanings:
{
  key: 'amount',
  label: 'Payment Amount',
  type: 'number',
  required: true,
  semanticRole: 'amount_money',
  format: 'currency_cents',    // ← critical: tells bridge this is cents, not dollars
  description: 'Amount in cents (e.g. 4999 = $49.99)',
}
```

```typescript
// Use descriptive field labels — the AI uses these as context:
{
  key: 'to',
  label: 'Recipient Phone Number (E.164 format)',  // ← helpful context for AI
  type: 'string',
  required: true,
  semanticRole: 'phone_number',
  format: 'phone_e164',
}
```

```typescript
// Add description for complex fields:
{
  key: 'created',
  label: 'Created At',
  type: 'number',
  required: true,
  semanticRole: 'timestamp',
  format: 'unix_timestamp',
  description: 'Unix timestamp in SECONDS (not milliseconds)',
}
```

### ❌ DO NOT

```typescript
// Don't use cryptic key names:
{ key: 'amt', label: 'Amt', type: 'number' }  // ← what is this? cents? dollars?

// Don't mix up formats:
{ key: 'date', type: 'number', format: 'iso_date' }  // ← number can't be ISO date
{ key: 'amount', type: 'string', format: 'currency_cents' }  // ← cents should be number
```

---

## Connector Categories & Typical Field Patterns

| Category | Typical Output Fields | Typical Input Fields |
|---|---|---|
| **Email** (Gmail, Outlook) | `from` (email), `subject` (title), `bodyPlain` (content) | `to` (email), `subject` (title), `body` (content) |
| **Messaging** (Slack, Discord, Telegram) | `message` (content), `from` (name), `channelId` (channel_id) | `channel` (channel_id), `text` (content) |
| **CRM** (HubSpot, Salesforce) | `email` (email), `firstname`+`lastname` (names), `createdate` (timestamp) | `email` (email), `dealname` (title), `amount` (money/dollars) |
| **Payments** (Stripe, PayPal) | `amount` (money/CENTS), `created` (unix_timestamp), `customerEmail` (email) | `amount` (money), `currency` (currency_code), `description` (content) |
| **Storage** (S3, Drive) | `fileUrl` (url), `name` (title), `mimeType` (string), `sizeBytes` (number) | `fileName` (title), `fileContent` (file_content), `folder` (string) |
| **AI** (Gemini, GPT) | `result` (content), `tokens` (count), `model` (string) | `prompt` (content), `model` (string), `temperature` (number) |

---

## Quick Reference: `semanticRole` Values

| Value | Use When | Examples |
|---|---|---|
| `email_address` | Field is an email address | `from`, `to`, `email`, `customerEmail` |
| `phone_number` | Field is a phone number | `phone`, `mobile`, `to` (in SMS/WhatsApp) |
| `full_name` | Field is a combined first+last name | `customerName`, `name`, `fullName` |
| `first_name` | Field is first name only | `firstName`, `fname`, `givenName` |
| `last_name` | Field is last name only | `lastName`, `lname`, `surname` |
| `message_content` | Field is the main text body | `text`, `body`, `content`, `message`, `bodyPlain` |
| `title_subject` | Field is a title, subject, or name | `subject`, `title`, `name`, `dealname`, `summary` |
| `description_body` | Field is a longer description | `description`, `body`, `details`, `notes` |
| `url_link` | Field is a URL | `fileUrl`, `issueUrl`, `pageUrl`, `link` |
| `timestamp` | Field is a date/time | `createdAt`, `date`, `timestamp`, `startTime` |
| `amount_money` | Field is a monetary amount | `amount`, `price`, `total`, `cost` |
| `currency_code` | Field is an ISO 4217 currency | `currency`, `currencyCode` |
| `unique_id` | Field is a system ID | `id`, `orderId`, `messageId`, `dealId` |
| `status` | Field is a status/state | `status`, `stage`, `state`, `phase` |
| `channel_id` | Field is a messaging channel | `channel`, `webhookUrl`, `chatId` |
| `tags_list` | Field is a list of tags | `tags`, `labels`, `categories` |
| `file_content` | Field is file data | `fileContent`, `data`, `attachment` |
| `json_data` | Field is arbitrary JSON | `metadata`, `properties`, `fieldsJson` |
| `count_number` | Field is a numeric count | `count`, `quantity`, `limit`, `total` |

---

## Quick Reference: `format` Values

| Value | Meaning | Coercion Applied |
|---|---|---|
| `email` | RFC 5321 email string | Extract from "Name <email>" format |
| `phone_e164` | E.164 phone (+14155552671) | Normalize any phone format to E.164 |
| `url` | Full URL | Ensure https:// prefix, encode special chars |
| `iso_date` | ISO 8601 date string | Convert unix timestamps, normalize format |
| `unix_timestamp` | Unix seconds (integer) | Convert to ISO date for targets needing dates |
| `unix_timestamp_ms` | Unix milliseconds | Divide by 1000, then convert to ISO |
| `currency_cents` | Integer cents (Stripe-style) | Divide by 100 when target needs dollars |
| `currency_dollars` | Float/string dollars | Multiply by 100 when target needs cents |
| `json_string` | JSON as a string | Parse to object or re-stringify |
| `html` | HTML markup | Strip tags for plain text targets |
| `markdown` | Markdown text | Convert to HTML or strip markup |
| `csv` | Comma-separated values | Split to array or join to string |
| `base64` | Base64 encoded data | Decode to buffer or string |
