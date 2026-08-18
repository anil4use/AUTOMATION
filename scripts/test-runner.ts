import { encryptJson, decryptJson } from '../apps/backend/src/shared/utils/crypto';
import { OAuth2Strategy, ApiKeyStrategy, WebhookStrategy, GmailConnector, SlackConnector } from '../packages/connector-sdk/src';
import { DAGRunner } from '../apps/worker/src/engine/dag-runner';
import { RateLimiter } from '../apps/worker/src/engine/rate-limiter';
import { AIAgentService } from '../apps/backend/src/modules/ai-agent/ai-agent.service';
import { BillingService } from '../apps/backend/src/modules/billing/billing.service';

async function runSystemTestSuite() {
  console.log('--------------------------------------------------');
  console.log('🚀 AUTOMATION PLATFORM — END-TO-END SYSTEM TEST SUITE');
  console.log('--------------------------------------------------');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. AES-256 Encryption / Decryption Test
  console.log('\n[1/6] Testing AES-256 Token Encryption Layer...');
  try {
    const payload = { accessToken: 'secret_oauth_token_123', refreshToken: 'secret_refresh_456' };
    const encrypted = encryptJson(payload);
    assert(Boolean(encrypted && encrypted.includes(':')), 'AES-256 Encryption output format (iv:encrypted)');
    const decrypted = decryptJson(encrypted);
    assert(decrypted.accessToken === payload.accessToken, 'AES-256 Decryption payload integrity');
  } catch (e: any) {
    assert(false, `AES-256 Encryption Test Error: ${e.message}`);
  }

  // 2. Connector SDK Strategies Test
  console.log('\n[2/6] Testing Connector SDK Auth & Manifests...');
  try {
    const gmailManifest = new GmailConnector().manifest;
    const slackManifest = new SlackConnector().manifest;
    assert(gmailManifest.id === 'gmail' && gmailManifest.triggers.length > 0, 'Gmail Connector Manifest validation');
    assert(slackManifest.id === 'slack' && slackManifest.actions.length > 0, 'Slack Connector Manifest validation');

    const authUrl = OAuth2Strategy.getAuthorizationUrl('gmail', 'http://localhost:3000/callback', 'state123');
    assert(authUrl.includes('accounts.google.com'), 'OAuth2 Strategy Authorization URL Generator');

    const isValidApiKey = ApiKeyStrategy.validateApiKey('sk_test_123456789');
    assert(isValidApiKey, 'API Key Validation Strategy');
  } catch (e: any) {
    assert(false, `Connector SDK Test Error: ${e.message}`);
  }

  // 3. AI Agent Prompt-to-JSON Pipeline Test
  console.log('\n[3/6] Testing AI Agent Prompt-to-DAG Pipeline...');
  try {
    const prompt = 'When I get a new email in Gmail, summarize it with AI and send a message to Slack';
    const result = await AIAgentService.generateWorkflow(prompt, 'test_org');
    assert(result.draftWorkflow.nodes.length === 3, 'AI Agent DAG Node Generation count (3 nodes)');
    assert(result.draftWorkflow.edges.length === 2, 'AI Agent DAG Edge Generation count (2 edges)');
    assert(result.missingConnectors.includes('gmail'), 'AI Agent Missing Connectors Flagging');
  } catch (e: any) {
    assert(false, `AI Agent Test Error: ${e.message}`);
  }

  // 4. Worker Engine DAG Execution Test
  console.log('\n[4/6] Testing Worker Engine DAG Runner & Replay...');
  try {
    const nodes = [
      { id: 'trig_1', type: 'trigger', connectorId: 'gmail', operationId: 'new_email', name: 'Trigger', config: {}, fieldMapping: {}, position: { x: 0, y: 0 } },
      { id: 'act_1', type: 'action', connectorId: 'slack', operationId: 'send_message', name: 'Action', config: {}, fieldMapping: {}, position: { x: 200, y: 0 } },
    ];
    const edges = [{ id: 'e1', source: 'trig_1', target: 'act_1' }];
    const triggerPayload = { body: 'New lead subject' };

    const results = await DAGRunner.run(nodes as any, edges, triggerPayload);
    assert(results['trig_1'].status === 'completed', 'DAG Runner Trigger Step Execution');
    assert(results['act_1'].status === 'completed', 'DAG Runner Action Step Execution');
  } catch (e: any) {
    assert(false, `Worker DAG Engine Test Error: ${e.message}`);
  }

  // 5. Billing & Usage Metering Test
  console.log('\n[5/6] Testing Billing & Usage Metering Service...');
  try {
    const checkout = await BillingService.createCheckoutSession('test_org', 'pro');
    assert(checkout.url.includes('checkout.stripe.com'), 'Stripe Test Mode Checkout Session Generator');
  } catch (e: any) {
    assert(false, `Billing Service Test Error: ${e.message}`);
  }

  // 6. Redis Rate Limiter Test
  console.log('\n[6/6] Testing Token-Bucket Rate Limiter...');
  try {
    const isAllowed = await RateLimiter.checkRateLimit('gmail', 'test_org', 60, 60);
    assert(isAllowed === true, 'Token-Bucket Rate Limiter execution');
  } catch (e: any) {
    assert(false, `Rate Limiter Test Error: ${e.message}`);
  }

  console.log('--------------------------------------------------');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('--------------------------------------------------');

  process.exit(failed > 0 ? 1 : 0);
}

runSystemTestSuite();
