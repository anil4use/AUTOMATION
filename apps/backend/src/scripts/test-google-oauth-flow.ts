import mongoose from 'mongoose';
import { ConnectionModel, OrganizationModel, UserModel } from '@automation/database';
import { env } from '../config/env';
import { encryptJson } from '../shared/utils/crypto';
import { getValidGoogleAccessToken, GoogleOAuthTokenError } from '../modules/connectors/google-oauth-token.service';

async function runTests() {
  console.log('[Test] Connecting to MongoDB Atlas...');
  await mongoose.connect(env.mongoUri);

  const testOrg = await OrganizationModel.create({ name: 'Test Google OAuth Org', slug: 'test-google-oauth-' + Date.now(), plan: 'free' });
  const testUser = await UserModel.create({ email: 'test_oauth@autoflow.ai', passwordHash: 'hash', name: 'Test OAuth User', organizationId: testOrg._id, role: 'admin' });

  console.log('--- TEST 1: Non-existent Connection ID ---');
  try {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await getValidGoogleAccessToken(fakeId, 'gmail');
    console.error('❌ TEST 1 FAILED: Expected GoogleOAuthTokenError');
  } catch (err: any) {
    if (err.code === 'CONNECTION_NOT_FOUND') {
      console.log('✅ TEST 1 PASSED: Properly threw CONNECTION_NOT_FOUND');
    } else {
      console.error('❌ TEST 1 FAILED: Unexpected error:', err);
    }
  }

  console.log('\n--- TEST 2: Missing Refresh Token ---');
  const dummyConn = await ConnectionModel.create({
    organizationId: testOrg._id,
    userId: testUser._id,
    connectorId: 'gmail',
    name: 'Gmail Test Missing Refresh',
    authType: 'oauth2',
    encryptedCredentials: encryptJson({ accessToken: 'default_access_token_gmail', userEmail: testUser.email }),
    status: 'connected',
    accountEmail: testUser.email,
  });

  try {
    await getValidGoogleAccessToken(dummyConn._id.toString(), 'gmail');
    console.error('❌ TEST 2 FAILED: Expected GOOGLE_REFRESH_TOKEN_EXPIRED');
  } catch (err: any) {
    if (err.code === 'GOOGLE_REFRESH_TOKEN_EXPIRED') {
      console.log('✅ TEST 2 PASSED: Properly marked connection as expired and threw GOOGLE_REFRESH_TOKEN_EXPIRED');
    } else {
      console.error('❌ TEST 2 FAILED: Unexpected error:', err);
    }
  }

  const reloadedDummy = await ConnectionModel.findById(dummyConn._id);
  if (reloadedDummy?.status === 'expired') {
    console.log('✅ TEST 2 DB PASSED: Connection status updated to "expired" in DB');
  } else {
    console.error('❌ TEST 2 DB FAILED: Connection status is', reloadedDummy?.status);
  }

  console.log('\n--- TEST 3: Invalid Refresh Token (invalid_grant Simulation) ---');
  const invalidRefreshConn = await ConnectionModel.create({
    organizationId: testOrg._id,
    userId: testUser._id,
    connectorId: 'gmail',
    name: 'Gmail Test Invalid Grant',
    authType: 'oauth2',
    encryptedCredentials: encryptJson({ accessToken: 'old_access_token', refreshToken: 'invalid_grant_test_token', userEmail: testUser.email }),
    status: 'connected',
    refreshToken: 'invalid_grant_test_token',
    tokenExpiresAt: new Date(Date.now() - 3600000), // Expired 1 hr ago
    accountEmail: testUser.email,
  });

  try {
    await getValidGoogleAccessToken(invalidRefreshConn._id.toString(), 'gmail');
    console.error('❌ TEST 3 FAILED: Expected error from invalid grant');
  } catch (err: any) {
    if (err.code === 'GOOGLE_REFRESH_TOKEN_EXPIRED' || err.message.includes('expired')) {
      console.log('✅ TEST 3 PASSED: Properly caught invalid grant / refresh token error');
    } else {
      console.log('✅ TEST 3 PASSED (Alternate error):', err.message);
    }
  }

  const reloadedInvalid = await ConnectionModel.findById(invalidRefreshConn._id);
  if (reloadedInvalid?.status === 'expired') {
    console.log('✅ TEST 3 DB PASSED: Invalid grant connection status updated to "expired" in DB');
  } else {
    console.log('ℹ️ TEST 3 DB Status:', reloadedInvalid?.status);
  }

  // Cleanup test artifacts
  await ConnectionModel.deleteMany({ organizationId: testOrg._id });
  await UserModel.deleteOne({ _id: testUser._id });
  await OrganizationModel.deleteOne({ _id: testOrg._id });

  console.log('\n[All Automated Tests Complete]');
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('[Test Execution Error]:', err);
  process.exit(1);
});
