import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository } from './auth.repository';
import { RegisterInput, LoginInput } from './auth.types';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app.error';
import { ConnectionModel } from '@automation/database';
import { encryptJson } from '../../shared/utils/crypto';

export class AuthService {
  /**
   * Ensures that every account has default connected Google & Workspace connectors
   * linked to the user's registered email address (e.g. Gmail, Google Sheets, Google Drive, Slack).
   */
  private static async ensureDefaultGoogleAccountConnections(orgId: string, userId: string, email: string, accessToken?: string) {
    try {
      const existing = await ConnectionModel.find({ organizationId: orgId });
      const existingMap = new Map(existing.map((c) => [c.connectorId, c]));

      const defaultConnectors = [
        { connectorId: 'gmail', name: `Gmail Google Account (${email})`, authType: 'oauth2' },
        { connectorId: 'google-sheets', name: `Google Sheets (${email})`, authType: 'oauth2' },
        { connectorId: 'google-drive', name: `Google Drive (${email})`, authType: 'oauth2' },
        { connectorId: 'google-calendar', name: `Google Calendar (${email})`, authType: 'oauth2' },
        { connectorId: 'google-docs', name: `Google Docs (${email})`, authType: 'oauth2' },
        { connectorId: 'slack', name: `Slack Workspace (${email})`, authType: 'oauth2' },
      ];

      const defaultExpiresAt = new Date(Date.now() + 3600 * 1000);

      for (const conn of defaultConnectors) {
        const hasRealToken = Boolean(accessToken && !accessToken.startsWith('default_access_token_'));
        const encryptedCredentials = encryptJson({
          accessToken: hasRealToken ? accessToken : '',
          userEmail: email,
          accountOwner: email,
          accountEmail: email,
          tokenExpiresAt: hasRealToken ? defaultExpiresAt.toISOString() : undefined,
          expiresAt: hasRealToken ? defaultExpiresAt.toISOString() : undefined,
          connectedAt: new Date().toISOString(),
        });

        const existingConn = existingMap.get(conn.connectorId);
        if (!existingConn) {
          await ConnectionModel.create({
            organizationId: orgId,
            userId,
            connectorId: conn.connectorId,
            name: conn.name,
            authType: conn.authType,
            encryptedCredentials,
            status: hasRealToken ? 'connected' : 'pending_auth',
            accountEmail: email,
            tokenExpiresAt: hasRealToken ? defaultExpiresAt : undefined,
            expiresAt: hasRealToken ? defaultExpiresAt : undefined,
          });
        } else if (hasRealToken) {
          // Upgrade existing default connection with real OAuth access token and expiration
          existingConn.encryptedCredentials = encryptedCredentials;
          existingConn.status = 'connected';
          existingConn.accountEmail = email;
          existingConn.tokenExpiresAt = defaultExpiresAt;
          existingConn.expiresAt = defaultExpiresAt;
          existingConn.lastRefreshError = undefined;
          await existingConn.save();
        }
      }
    } catch (err) {
      console.error('[AuthService] Error auto-linking default Google account:', err);
    }
  }

  /**
   * Generates standard Google OAuth 2.0 Authorization URL with prompt=select_account.
   * Checks if process.env.GOOGLE_CLIENT_ID is configured in .env before generating redirect URL.
   */
  static getGoogleAuthUrl() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const isConfigured = Boolean(
      clientId &&
        !clientId.includes('placeholder') &&
        clientId !== 'autoflow-google-client-id' &&
        clientId.includes('.apps.googleusercontent.com')
    );

    if (!isConfigured) {
      return { url: null, isConfigured: false };
    }

    const redirectUri = `${env.clientUrl}/auth/google/callback`;
    const scope = encodeURIComponent('openid email profile');
    
    // Standard Google OAuth 2.0 URL with prompt=select_account
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;

    return { url, isConfigured: true, redirectUri };
  }

  /**
   * Exchanges Google OAuth authorization code for Google user profile
   */
  static async handleGoogleCodeExchange(code: string) {
    let email = 'user@autoflow.io';
    let name = 'Workspace User';

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${env.clientUrl}/auth/google/callback`;

    if (googleClientId && googleClientSecret && code && !code.startsWith('demo_')) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: googleClientId,
            client_secret: googleClientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
        const tokenData = await tokenRes.json();

        if (tokenData.id_token) {
          const base64Payload = tokenData.id_token.split('.')[1];
          const decoded = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'));
          if (decoded.email) {
            email = decoded.email;
            name = decoded.name || decoded.email.split('@')[0];
          }
        }
      } catch (err) {
        console.error('[AuthService] Real Google OAuth token exchange error:', err);
      }
    }

    return await AuthService.googleAuth({ email, name });
  }

  static async googleAuth(input: { email: string; name?: string; avatar?: string; idToken?: string; accessToken?: string }) {
    let email = input.email;
    let name = input.name;

    if (input.idToken) {
      try {
        const parts = input.idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.email) email = payload.email;
          if (payload.name && !name) name = payload.name;
        }
      } catch (e) {
        console.warn('[AuthService] Could not parse idToken payload:', e);
      }
    }

    let user = await AuthRepository.findByEmail(email);
    let orgId: string;

    if (!user) {
      // Auto-create organization and user for Google Account
      const userName = name || email.split('@')[0];
      const slug = userName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-org-' + Date.now().toString().slice(-4);
      const org = await AuthRepository.createOrganization({
        name: `${userName}'s Org`,
        slug,
        plan: 'free',
      });

      const passwordHash = await bcrypt.hash(`google_auth_${Date.now()}_${Math.random()}`, 10);
      user = await AuthRepository.createUser({
        email,
        passwordHash,
        name: userName,
        organizationId: org._id,
        role: 'admin',
      });
      orgId = org._id.toString();
    } else {
      orgId = user.organizationId.toString();
    }

    // Auto-link default Google account connectors with real OAuth access token for this email in MongoDB
    await AuthService.ensureDefaultGoogleAccountConnections(orgId, user._id.toString(), user.email, input.accessToken);

    const payload = { userId: user._id.toString(), organizationId: orgId, role: user.role, email: user.email };
    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });

    return {
      user: { id: user._id.toString(), email: user.email, name: user.name, organizationId: orgId, role: user.role },
      token,
    };
  }

  static async register(input: RegisterInput) {
    const existing = await AuthRepository.findByEmail(input.email);
    if (existing) throw new AppError('Email already registered', 400);

    const slug = (input.orgName || `${input.name}'s Org`).toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);
    const org = await AuthRepository.createOrganization({
      name: input.orgName || `${input.name}'s Org`,
      slug,
      plan: 'free',
    });

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await AuthRepository.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
      organizationId: org._id,
      role: 'admin',
    });

    // Auto-link Google Account connectors for this user's email address by default
    await AuthService.ensureDefaultGoogleAccountConnections(org._id.toString(), user._id.toString(), user.email);

    const payload = { userId: user._id.toString(), organizationId: org._id.toString(), role: user.role, email: user.email };
    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });

    return {
      user: { id: user._id.toString(), email: user.email, name: user.name, organizationId: org._id.toString(), role: user.role },
      token,
    };
  }

  static async login(input: LoginInput) {
    const user = await AuthRepository.findByEmail(input.email);
    if (!user) throw new AppError('Invalid credentials', 401);

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) throw new AppError('Invalid credentials', 401);

    // Auto-link Google Account connectors for this user's email address by default
    await AuthService.ensureDefaultGoogleAccountConnections(user.organizationId.toString(), user._id.toString(), user.email);

    const payload = { userId: user._id.toString(), organizationId: user.organizationId.toString(), role: user.role, email: user.email };
    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });

    return {
      user: { id: user._id.toString(), email: user.email, name: user.name, organizationId: user.organizationId.toString(), role: user.role },
      token,
    };
  }
}
