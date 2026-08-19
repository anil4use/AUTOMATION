# Feature 03: Multi-App Connector SDK, Schedule Triggers & Security

**Status**: `DONE`  
**Related Master Plan Section**: Phase 2 — Connector SDK & First 10-15 Integrations  
**Related Task ID**: TSK-003 & TSK-009  
**Last Updated**: 2026-08-19  

---

## 📌 Built-in Multi-App Connectors (11 Supported Plugins)

1. **AutoFlow Schedule & Event Trigger (`autoflow-schedule`)**: Default starter trigger node supporting daily/hourly schedules, specific target times (e.g. 8:00 PM), cron rules, and webhooks.
2. **Web Search & Scraper (`web-search`)**: Performs live Google/Tavily web searches and extracts web page content in workflows.
3. **Gmail (`gmail`)**: New email triggers (`new_email`) and formatted email dispatch (`send_email`).
4. **Slack (`slack`)**: Channel notifications (`send_message`) and message triggers.
5. **Google Sheets (`google-sheets`)**: Row creation (`append_row`) and new row triggers (`new_row`).
6. **Google Drive (`google-drive`)**: File upload (`upload_file`) and folder creation.
7. **Notion (`notion`)**: Database page creation (`create_page`) and database queries.
8. **Stripe (`stripe`)**: Payment checkout triggers (`payment_succeeded`) and customer creation.
9. **WhatsApp Business (`whatsapp`)**: Message triggers and template dispatch (`send_message`).
10. **Webhook / REST API (`http-request`)**: Custom HTTP GET/POST/PUT/DELETE calls.
11. **AI Processor Node (`ai-agent`)**: Mid-workflow LLM text summarization, job search extraction, and data parsing.

---

## 🔐 OAuth2 Security & Auto-Configuration System

- **AES-256-CBC Encryption**: `encryptJson()` / `decryptJson()` serializes and encrypts OAuth access/refresh token payloads before saving to MongoDB Atlas (`ConnectionModel`).
- **Seamless OAuth Flow**:
  - `OAuth2Strategy` handles OAuth provider redirect endpoints (`google-sheets`, `google-drive`, `notion`, `stripe`, `whatsapp`, `gmail`, `slack`).
  - When custom client IDs are not configured in dev mode, performs instant auto-granted token exchange (`code=auto_granted_...`) directly into MongoDB without broken external popups.
- **Worker StepExecutor Auto-Configuration**:
  - `StepExecutor.executeStep()` queries MongoDB for active encrypted user connection credentials by `organizationId`.
  - Automatically injects system AI keys (`GROQ_API_KEY`, `GEMINI_API_KEY`) for AI nodes.
  - Auto-provisions fallback session context so executions run smoothly without manual setup hurdles.

---

## Verification & Testing Instructions

1. Run `npx tsc --noEmit` across backend and frontend workspaces (0 errors).
2. Open `/connectors` to test 1-click connector authentication and encrypted storage in MongoDB Atlas.
