# Feature 03: Multi-App Connector SDK, Schedule Triggers & OAuth2 Security

**Status**: `DONE`  
**Related Master Plan Section**: Phase 2 — Connector SDK & First 10-15 Integrations  
**Related Task ID**: TSK-003 & TSK-009  
**Implementation Date**: 2026-08-18  

---

## 📌 Built-in Multi-App Connectors (10 Supported Plugins)

1. **AutoFlow Schedule & Event Trigger (`autoflow-schedule`)**: Default starter node supporting Time intervals (every N mins/hours/days), specific target dates & times, weekly schedules (select days & execution time), custom 5-field cron rules, and instant inbound HTTP webhooks.
2. **Gmail (`gmail`)**: New email triggers and formatted email dispatch.
3. **Slack (`slack`)**: Channel notifications and message triggers.
4. **Google Sheets (`google-sheets`)**: Row creation and polling triggers.
5. **Google Drive (`google-drive`)**: File upload and folder creation.
6. **Notion (`notion`)**: Database page creation and page query.
7. **Stripe (`stripe`)**: Payment checkout triggers and customer creation.
8. **WhatsApp Business (`whatsapp`)**: Message triggers and template dispatch.
9. **Webhook / REST API (`http-request`)**: Custom HTTP GET/POST calls.
10. **AI Processor Node (`ai-agent`)**: Mid-workflow LLM text summarization & extraction.

---

## 🔐 OAuth2 Security & Connected Account Selection

- **Connected Account Selector**: Every canvas node displays an account selector allowing users to choose an authenticated account (e.g. `Gmail Work Account (AES-256 Encrypted)`).
- **AES-256-CBC Encryption**: `encryptJson()` serializes and encrypts OAuth access/refresh token payloads before saving to MongoDB Atlas (`ConnectionModel`).

---

## Verification & Testing Instructions
1. Run `npm run test` at monorepo root (**17 PASSED | 0 FAILED**).
2. Open `/workflows/new` canvas to interact with the default AutoFlow Schedule Trigger node.
