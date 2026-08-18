# Feature 03: Connector SDK, OAuth2 Flow & AES-256 Token Encryption

**Status**: `DONE`  
**Related Master Plan Section**: Phase 2 — Connector SDK & First 10-15 Integrations  
**Related Task ID**: TSK-003 & TSK-009  
**Implementation Date**: 2026-08-18  

---

## Overview

`packages/connector-sdk` and `apps/backend/src/modules/connectors` form the integration plugin and credential security engine. All OAuth2 access/refresh tokens and API keys are encrypted with **AES-256-CBC** using `TOKEN_ENCRYPTION_KEY` before persisting to MongoDB Atlas (`ConnectionModel`).

---

## OAuth2 & Security Flow

1. **Authorization URL Generation**: `GET /api/v1/connectors/oauth/authorize/:connectorId` creates provider authorization URL (Google, Slack, etc.) with state encoding `orgId` and `userId`.
2. **Callback & Code Exchange**: `POST /api/v1/connectors/oauth/callback/:connectorId` exchanges authorization code for access and refresh tokens.
3. **AES-256 Encryption**: `encryptJson()` serializes and encrypts the token payload using `crypto.scryptSync` + `aes-256-cbc`.
4. **API Key & Webhook Support**: `POST /api/v1/connectors/connections/api-key` securely encrypts and stores API keys (e.g. Notion, OpenAI).
5. **Decryption at Execution**: `ConnectorService.getDecryptedCredentials()` decrypts the payload at job execution time for `BaseConnector.executeAction()`.

---

## API Endpoints (`apps/backend/src/modules/connectors/connector.routes.ts`)

- `GET /api/v1/connectors/available`: List all manifest plugins.
- `GET /api/v1/connectors/connections`: List user organization connections (omitting raw secrets).
- `GET /api/v1/connectors/oauth/authorize/:connectorId`: Generate OAuth authorize URL.
- `POST /api/v1/connectors/oauth/callback/:connectorId`: Complete OAuth code exchange & store encrypted connection.
- `POST /api/v1/connectors/connections/api-key`: Save encrypted API key connection.
- `DELETE /api/v1/connectors/connections/:id`: Delete/revoke connection.

---

## Verification & Testing Instructions
1. Run `npm run build` at monorepo root.
2. Test `GET /api/v1/connectors/oauth/authorize/gmail`.
