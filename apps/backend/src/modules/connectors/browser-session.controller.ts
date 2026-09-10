import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';
import { encryptJson } from '../../shared/utils/crypto';
import { ConnectionModel } from '@automation/database';
import { logger } from '../../config/logger';
import { randomUUID } from 'crypto';

interface ActiveAuthSession {
  sessionId: string;
  connectorId: string;
  userId: string;
  orgId: string;
  status: 'waiting' | 'authenticated' | 'failed' | 'cancelled' | 'expired';
  createdAt: Date;
  accountName?: string;
  accountEmail?: string;
  cookies?: any[];
  userAgent?: string;
  loginUrl: string;
  browserProcess?: any;
}

// Active session in-memory map
const activeAuthSessions = new Map<string, ActiveAuthSession>();

// Run 60-second cleanup interval for sessions older than 5 minutes
setInterval(() => {
  const now = Date.now();
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  for (const [sessionId, session] of activeAuthSessions.entries()) {
    if (now - session.createdAt.getTime() > FIVE_MINUTES_MS) {
      logger.info(`[BrowserSession] Cleaning up expired auth session: ${sessionId}`);
      if (session.browserProcess && typeof session.browserProcess.close === 'function') {
        try { session.browserProcess.close(); } catch { }
      }
      session.status = 'expired';
      activeAuthSessions.delete(sessionId);
    }
  }
}, 60_000);

export class BrowserSessionController {

  /** POST /api/v1/connectors/browser-session/start */
  static async startSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { connectorId } = req.body;
      const userId = req.user!.userId;
      const orgId = req.user!.organizationId;

      if (!connectorId || !['linkedin', 'indeed'].includes(connectorId)) {
        return sendResponse(res, 400, false, null, 'Valid connectorId (linkedin, indeed) is required');
      }

      const sessionId = randomUUID();
      const targetUrl = connectorId === 'linkedin'
        ? 'https://www.linkedin.com/login'
        : 'https://secure.indeed.com/account/login';

      let browserProcess: any = null;

      // Attempt Playwright browser launch
      try {
        const playwright = require('playwright');
        const browser = await playwright.chromium.launch({ headless: true });
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        });
        const page = await context.newPage();
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        browserProcess = browser;
      } catch (err: any) {
        logger.warn(`[BrowserSession] Playwright launch fallback for ${connectorId}:`, err?.message);
      }

      const sessionObj: ActiveAuthSession = {
        sessionId,
        connectorId,
        userId,
        orgId,
        status: 'waiting',
        createdAt: new Date(),
        loginUrl: targetUrl,
        browserProcess,
      };

      activeAuthSessions.set(sessionId, sessionObj);

      return sendResponse(res, 200, true, {
        sessionId,
        loginUrl: targetUrl,
        connectorId,
        expiresInSeconds: 300,
      }, 'Browser authentication session started');
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/v1/connectors/browser-session/status/:sessionId */
  static async getSessionStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const session = activeAuthSessions.get(sessionId);

      if (!session) {
        return sendResponse(res, 404, false, { status: 'expired' }, 'Session not found or expired');
      }

      // Perform background check on Playwright browser if active
      if (session.status === 'waiting' && session.browserProcess) {
        try {
          const contexts = session.browserProcess.contexts();
          if (contexts.length > 0) {
            const page = contexts[0].pages()[0];
            const cookies = await contexts[0].cookies();
            const currentUrl = page ? page.url() : '';

            let isAuthenticated = false;
            let accountName = 'Verified User';
            let accountEmail = `${session.connectorId}_user@example.com`;

            if (session.connectorId === 'linkedin') {
              const liAt = cookies.find((c: any) => c.name === 'li_at');
              if (liAt || currentUrl.includes('linkedin.com/feed')) {
                isAuthenticated = true;
                session.cookies = cookies;
                session.userAgent = await page.evaluate(() => navigator.userAgent).catch(() => '');
                try {
                  const title = await page.title();
                  if (title && !title.includes('Login')) accountName = title.split('|')[0].trim();
                } catch { }
              }
            } else if (session.connectorId === 'indeed') {
              const ctk = cookies.find((c: any) => c.name === 'CTK');
              if (ctk || currentUrl.includes('indeed.com')) {
                isAuthenticated = true;
                session.cookies = cookies;
                session.userAgent = await page.evaluate(() => navigator.userAgent).catch(() => '');
              }
            }

            if (isAuthenticated) {
              session.status = 'authenticated';
              session.accountName = accountName;
              session.accountEmail = accountEmail;

              // Save connection to MongoDB Atlas
              const encryptedCredentials = encryptJson({
                authMethod: 'browser_session',
                cookies: session.cookies,
                userAgent: session.userAgent || '',
                sessionCapturedAt: new Date().toISOString(),
                sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                accountName,
                accountEmail,
              });

              await ConnectionModel.create({
                organizationId: session.orgId,
                connectorId: session.connectorId,
                name: `${session.connectorId === 'linkedin' ? 'LinkedIn' : 'Indeed'} Browser Session (${accountName})`,
                status: 'connected',
                encryptedCredentials,
                authType: 'oauth2',
                environmentTag: 'production',
              });

              try { session.browserProcess.close(); } catch { }
            }
          }
        } catch (err: any) {
          logger.warn(`[BrowserSession] Status check error:`, err?.message);
        }
      }

      return sendResponse(res, 200, true, {
        sessionId: session.sessionId,
        status: session.status,
        accountName: session.accountName,
        accountEmail: session.accountEmail,
      }, 'Session status retrieved');
    } catch (err) {
      next(err);
    }
  }

  /** POST /api/v1/connectors/browser-session/capture */
  static async captureSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { sessionId, cookies, accountName, accountEmail } = req.body;
      const session = activeAuthSessions.get(sessionId);

      const targetOrg = session?.orgId || req.user!.organizationId;
      const targetConnector = session?.connectorId || req.body.connectorId || 'linkedin';

      const encryptedCredentials = encryptJson({
        authMethod: 'browser_session',
        cookies: cookies || session?.cookies || [],
        userAgent: session?.userAgent || 'Mozilla/5.0 Chrome/122.0',
        sessionCapturedAt: new Date().toISOString(),
        sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        accountName: accountName || session?.accountName || 'Authenticated User',
        accountEmail: accountEmail || session?.accountEmail || `${targetConnector}_user@example.com`,
      });

      const connection = await ConnectionModel.create({
        organizationId: targetOrg,
        connectorId: targetConnector,
        name: `${targetConnector === 'linkedin' ? 'LinkedIn' : 'Indeed'} Session (${accountName || 'Authenticated User'})`,
        status: 'connected',
        encryptedCredentials,
        authType: 'oauth2',
        environmentTag: 'production',
      });

      if (session) {
        session.status = 'authenticated';
        if (session.browserProcess) {
          try { session.browserProcess.close(); } catch { }
        }
        activeAuthSessions.delete(sessionId);
      }

      return sendResponse(res, 201, true, {
        connectionId: String(connection._id),
        status: 'authenticated',
        accountName: accountName || 'Authenticated User',
      }, 'Browser session captured and saved to connection');
    } catch (err) {
      next(err);
    }
  }
}
