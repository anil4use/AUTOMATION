import mongoose from 'mongoose';
import { ConnectionModel } from '@automation/database';
import { env } from '../config/env';
import { decryptJson } from '../shared/utils/crypto';

const GOOGLE_CONNECTORS = ['gmail', 'google-sheets', 'google-drive', 'google-docs', 'google-calendar'];

async function fixGoogleConnections() {
  console.log('[Migration] Connecting to MongoDB Atlas...');
  await mongoose.connect(env.mongoUri);
  console.log('[Migration] Connected successfully. Scanning Google connections...');

  const connections = await ConnectionModel.find({
    connectorId: { $in: GOOGLE_CONNECTORS },
  });

  console.log(`[Migration] Found ${connections.length} Google connection record(s). Checking for broken/legacy states...`);

  let updatedCount = 0;

  for (const conn of connections) {
    let creds: Record<string, any> = {};
    try {
      if (conn.encryptedCredentials) creds = decryptJson(conn.encryptedCredentials);
    } catch {}

    const accessToken = creds.accessToken || creds.access_token || '';
    const refreshToken = creds.refreshToken || creds.refresh_token || conn.refreshToken || '';
    const isDummyAccess = !accessToken || accessToken.startsWith('default_access_token_') || accessToken.includes('dummy');
    const isMissingRefresh = !refreshToken || refreshToken.startsWith('refresh_token_') || refreshToken.includes('dummy');
    const isMissingExpiration = !conn.tokenExpiresAt && !conn.expiresAt;

    if (isDummyAccess || isMissingRefresh || isMissingExpiration || conn.status === 'pending_auth') {
      conn.status = 'expired';
      conn.lastRefreshError = 'Legacy connection — requires Google re-authorization';
      await conn.save();
      updatedCount++;
      console.log(`  -> Connection ${conn._id} (${conn.connectorId} - ${conn.name}) updated to 'expired'`);
    }
  }

  console.log(`\n[Migration Complete] Total Google connections updated to 'expired': ${updatedCount} / ${connections.length}`);
  await mongoose.disconnect();
}

fixGoogleConnections().catch((err) => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
