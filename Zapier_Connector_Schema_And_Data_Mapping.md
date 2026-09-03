# Comprehensive Guide: Zapier Connector Schemas, Data Normalization & Dynamic Field Mapping

This document provides a deep, technical breakdown of how a **Zapier-like platform connects completely different third-party APIs seamlessly** without writing custom code between every pair of applications.

---

## 1. The Core Architecture: Standard Contracts & Adapters

Zapier does **not** force third-party APIs to become identical internally, nor does it write pair-wise code for every combination of apps (`CRM ➔ Slack`, `CRM ➔ Gmail`, `CRM ➔ Shopify`).

Instead, it wraps every application in a **Standardized Adapter**:

```text
                    WORKFLOW ENGINE
                           │
                  Standard Interface
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       CRM Adapter    Sheets Adapter    Slack Adapter
          │                │                │
       CRM API          Google API       Slack API
```

### The Standard Contract
Every connector operation follows a single universal pattern:

$$\text{INPUT} \longrightarrow \text{EXECUTE} \longrightarrow \text{OUTPUT}$$

- **CRM Connector**: Normalizes `{ "first_name": "Anil", "email_address": "anil@gmail.com" }` ➔ `{ "name": "Anil", "email": "anil@gmail.com" }`
- **Google Sheets Connector**: Translates standard input ➔ `{ "values": [["Anil", "anil@gmail.com"]] }`
- **Slack Connector**: Translates standard input ➔ `{ "channel": "sales", "text": "New lead: Anil" }`

---

## 2. The Workflow Context Bridge

The **Workflow Execution Context** is the bridge that isolates apps from knowing anything about each other:

```text
              CRM
               │
               │ Raw API response
               ▼
        ┌───────────────┐
        │ CRM Connector │
        └───────┬───────┘
                │
                │ NORMALIZED OUTPUT
                ▼
        ┌─────────────────┐
        │ Workflow Context│
        └────────┬────────┘
                 │
                 │ Mapping ({{trigger.email}})
                 ▼
        ┌─────────────────┐
        │ Google Connector│
        └────────┬────────┘
                 │
                 │ TARGET TRANSFORM
                 ▼
           Google API
```

**Key Takeaway**: The CRM never knows Google Sheets exists, and Google Sheets never knows CRM exists. The Workflow Engine + Mapping Engine handles all translations.

---

## 3. The 4 Fundamental Architecture Layers

```text
┌─────────────────────────────┐
│        App Connector        │  (Gmail, Slack, Shopify, etc.)
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│      Standard Schema        │  (Inputs + Outputs + Field Types)
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│       Data Mapper           │  ({{step_1.email}} ➔ Target Input)
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│       Target Connector      │  (Converts to Target API Format)
└──────────────┬──────────────┘
```

**Scaling Math**: With $1,000$ applications, you do **NOT** build $1,000 \times 1,000 = 1,000,000$ integrations. You build **$1,000$ standardized connectors + 1 common automation engine**.

---

## 4. Connector Field Types & Data Transformations

### Field Types
Connectors declare standard types for every input and output field:
- `string`
- `number`
- `boolean`
- `datetime`
- `array`
- `object`
- `file`
- `url`
- `email`

### Transformation Layer
When data types are incompatible (e.g. App A outputs price as `"$25,000"` text, but App B requires price as `25000` number), the data passes through an intermediate Formatter/Transform node:

$$\text{CONNECTOR} \longrightarrow \text{NORMALIZED DATA} \longrightarrow \text{TRANSFORMATION} \longrightarrow \text{TARGET CONNECTOR}$$

---

## 5. Dynamic Metadata-Driven UI & Dynamic Forms

The React workflow builder has **zero hardcoded app forms**. The frontend is a generic form renderer that queries the connector's schema dynamically.

```text
Selected App
      ↓
Selected Action
      ↓
Fetch Action Schema (inputFields)
      ↓
Dynamic Form Renderer
      ↓
Render Input Controls
```

### Action Schema Example:
```json
{
  "action": "send_email",
  "inputFields": [
    { "key": "to", "label": "To", "type": "email", "required": true },
    { "key": "subject", "label": "Subject", "type": "text", "required": true },
    { "key": "body", "label": "Body", "type": "textarea", "required": true }
  ]
}
```

If the user changes the action from `send_email` to `add_label`, the builder fetches `gmail.add_label` schema and re-renders the fields instantly.

---

## 6. Dynamic Select Fields & Dependency Chains

Some fields cannot be known beforehand because they depend on third-party user data (e.g., specific Slack channels or Google Sheets tabs).

Connectors declare `dynamic_select` types with `dependsOn` arrays:

```json
{
  "fields": [
    {
      "key": "spreadsheet",
      "type": "dynamic_select",
      "label": "Spreadsheet",
      "options": { "method": "list_spreadsheets" }
    },
    {
      "key": "sheet",
      "type": "dynamic_select",
      "label": "Worksheet",
      "dependsOn": ["spreadsheet"],
      "options": { "method": "list_sheets" }
    }
  ]
}
```

### Cascading Dependency Execution:
```text
Spreadsheet Selected
       │
       ▼
list_sheets(spreadsheetId)
       │
       ▼
Worksheet Selected
       │
       ▼
get_columns(sheetId)
       │
       ▼
Columns Rendered in Form (Name, Email, Phone)
```

---

## 7. The 3 Categories of Form Fields

| Category | Description | Example |
|---|---|---|
| **1. Static Fields** | Known beforehand in connector schema | Email `to`, Subject, Message `body` |
| **2. Dynamic Fields** | Fetched live from the external application | Spreadsheet, Worksheet, Slack Channel |
| **3. Computed Output Fields** | Produced by previous step executions | Lead ID, Customer ID, Order Amount |

---

## 8. Complete System Architecture Flowchart

```text
                 USER SELECTS APP
                        │
                        ▼
                SELECTS ACTION
                        │
                        ▼
              Connector Registry
                        │
                        ▼
                 Action Schema
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
        Input Fields          Output Schema
             │                     │
             ▼                     ▼
       Dynamic Form          Data Picker
             │                     │
             └──────────┬──────────┘
                        ▼
                  User Mapping
                        │
                        ▼
                  Save Workflow
                        │
                        ▼
                   Run Workflow
                        │
                        ▼
                 Resolve Variables ({{step.field}})
                        │
                        ▼
                 Execute Connector
                        │
                        ▼
                    API Response
                        │
                        ▼
               Normalize Output
                        │
                        ▼
                Next Step Context
```
