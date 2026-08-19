import { encryptJson, decryptJson } from '../apps/backend/src/shared/utils/crypto';
import { AutoFlowScheduleConnector } from '../packages/connector-sdk/src/connectors/autoflow-schedule.connector';
import { GmailConnector } from '../packages/connector-sdk/src/integrations/gmail';
import { SlackConnector } from '../packages/connector-sdk/src/integrations/slack';
import { GoogleSheetsConnector } from '../packages/connector-sdk/src/integrations/google-sheets';
import { GoogleDriveConnector } from '../packages/connector-sdk/src/connectors/google-drive.connector';
import { NotionConnector } from '../packages/connector-sdk/src/connectors/notion.connector';
import { StripeConnector } from '../packages/connector-sdk/src/connectors/stripe.connector';
import { WhatsAppConnector } from '../packages/connector-sdk/src/connectors/whatsapp.connector';
import { AINodeConnector } from '../packages/connector-sdk/src/integrations/ai-node';
import { OAuth2Strategy } from '../packages/connector-sdk/src/auth/oauth2.strategy';
import { ApiKeyStrategy } from '../packages/connector-sdk/src/auth/api-key.strategy';
import { DAGRunner } from '../apps/worker/src/engine/dag-runner';
import { StepExecutor } from '../apps/worker/src/engine/step-executor';
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
  console.log('\n[1/7] Testing AES-256 Token Encryption Layer...');
  try {
    const payload = { accessToken: 'secret_oauth_token_123', refreshToken: 'secret_refresh_456' };
    const encrypted = encryptJson(payload);
    assert(Boolean(encrypted && encrypted.includes(':')), 'AES-256 Encryption output format (iv:encrypted)');
    const decrypted = decryptJson(encrypted);
    assert(decrypted.accessToken === payload.accessToken, 'AES-256 Decryption payload integrity');
  } catch (e: any) {
    assert(false, `AES-256 Encryption Test Error: ${e.message}`);
  }

  // 2. Multi-App Connector SDK Strategies Test
  console.log('\n[2/7] Testing Multi-App Connector SDK Auth & Manifests...');
  try {
    const scheduleManifest = new AutoFlowScheduleConnector().manifest;
    const gmailManifest = new GmailConnector().manifest;
    const slackManifest = new SlackConnector().manifest;
    const driveManifest = new GoogleDriveConnector().manifest;
    const notionManifest = new NotionConnector().manifest;
    const stripeManifest = new StripeConnector().manifest;
    const whatsappManifest = new WhatsAppConnector().manifest;

    assert(scheduleManifest.id === 'autoflow-schedule' && scheduleManifest.triggers.length > 0, 'AutoFlow Schedule Trigger Manifest validation');
    assert(gmailManifest.id === 'gmail' && gmailManifest.triggers.length > 0, 'Gmail Connector Manifest validation');
    assert(slackManifest.id === 'slack' && slackManifest.actions.length > 0, 'Slack Connector Manifest validation');
    assert(driveManifest.id === 'google-drive' && driveManifest.actions.length > 0, 'Google Drive Connector Manifest validation');
    assert(notionManifest.id === 'notion' && notionManifest.actions.length > 0, 'Notion Connector Manifest validation');
    assert(stripeManifest.id === 'stripe' && stripeManifest.triggers.length > 0, 'Stripe Connector Manifest validation');
    assert(whatsappManifest.id === 'whatsapp' && whatsappManifest.actions.length > 0, 'WhatsApp Connector Manifest validation');

    const authUrl = OAuth2Strategy.getAuthorizationUrl('gmail', 'http://localhost:3000/callback', 'state123');
    assert(authUrl.includes('accounts.google.com'), 'OAuth2 Strategy Authorization URL Generator');

    const isValidApiKey = ApiKeyStrategy.validateApiKey('sk_test_123456789');
    assert(isValidApiKey, 'API Key Validation Strategy');
  } catch (e: any) {
    assert(false, `Connector SDK Test Error: ${e.message}`);
  }

  // 3. AI Agent Prompt-to-JSON Pipeline Test
  console.log('\n[3/7] Testing AI Agent Prompt-to-DAG Pipeline...');
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
  console.log('\n[4/7] Testing Worker Engine DAG Runner & Replay...');
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
  console.log('\n[5/7] Testing Billing & Usage Metering Service...');
  try {
    const checkout = await BillingService.createCheckoutSession('test_org', 'pro');
    assert(checkout.url.includes('checkout.stripe.com'), 'Stripe Test Mode Checkout Session Generator');
  } catch (e: any) {
    assert(false, `Billing Service Test Error: ${e.message}`);
  }

  // 6. Redis Rate Limiter Test
  console.log('\n[6/7] Testing Token-Bucket Rate Limiter...');
  try {
    const isAllowed = await RateLimiter.checkRateLimit('gmail', 'test_org', 60, 60);
    assert(isAllowed === true, 'Token-Bucket Rate Limiter execution');
  } catch (e: any) {
    assert(false, `Rate Limiter Test Error: ${e.message}`);
  }

  // 7. Multi-Step Pipeline Data Passing (User Job Search Workflow: 2PM Schedule -> AI Search -> Google Sheets -> WhatsApp)
  console.log('\n[7/7] Testing 4-Step Job Search Pipeline (Schedule -> AI Job Search -> Google Sheets -> WhatsApp)...');
  try {
    // Step 1: Schedule Trigger (2:00 PM Daily)
    const step1Result = await new AutoFlowScheduleConnector().executeAction('schedule_time', {
      connectionCredentials: {},
      stepInput: { executionTime: '14:00', intervalType: 'daily' },
      workflowVariables: {},
    });
    assert(step1Result.success && Boolean(step1Result.data.triggeredAt), 'Step 1: 2:00 PM Schedule Trigger Output');

    // Step 2: AI Processor Node searches jobs & outputs job listings
    const step2Result = await new AINodeConnector().executeAction('summarize_text', {
      connectionCredentials: {},
      stepInput: { text: `Extract job postings for 2PM run ${step1Result.data.triggeredAt}` },
      workflowVariables: { n_1: { output: step1Result.data } },
    });
    assert(step2Result.success && Boolean(step2Result.data.result), 'Step 2: AI Job Search Node Output');

    // Step 3: Google Sheets Action receives AI results & generates Google Sheet URL
    const step3Result = await new GoogleSheetsConnector().executeAction('append_row', {
      connectionCredentials: {},
      stepInput: {
        spreadsheetId: 'sheet_jobs_2026',
        values: [step2Result.data.result],
      },
      workflowVariables: { n_1: { output: step1Result.data }, n_2: { output: step2Result.data } },
    });
    assert(step3Result.success && step3Result.data.spreadsheetUrl.includes('docs.google.com'), 'Step 3: Google Sheets Creation Output');

    // Step 4: WhatsApp Action receives Google Sheet Link from Step 3 via {{nodes.n_3.output.spreadsheetUrl}}
    const interpolatedWhatsAppText = StepExecutor.interpolateVariables(
      'Your 2PM daily job search task is done! Here is the Google Sheet link: {{nodes.n_3.output.spreadsheetUrl}}',
      { nodes: { n_3: { output: step3Result.data } } }
    );
    assert(
      interpolatedWhatsAppText.includes('https://docs.google.com/spreadsheets/d/'),
      'Step 4: WhatsApp Message Data Interpolation passing Google Sheet link'
    );

    const step4Result = await new WhatsAppConnector().executeAction('send_message', {
      connectionCredentials: {},
      stepInput: { recipient: '+447000000000', message: interpolatedWhatsAppText },
      workflowVariables: { n_3: { output: step3Result.data } },
    });
    assert(step4Result.success && step4Result.data.messageId.includes('wa_msg_'), 'Step 4: WhatsApp Dispatch with interpolated Sheet link');
  } catch (e: any) {
    assert(false, `Multi-Step Pipeline Data Passing Error: ${e.message}`);
  }

  console.log('--------------------------------------------------');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('--------------------------------------------------');

  process.exit(failed > 0 ? 1 : 0);
}

runSystemTestSuite();
