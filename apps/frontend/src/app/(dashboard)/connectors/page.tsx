'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu, Lock, Trash2, ShieldCheck, X, Loader2, RefreshCw, CheckCircle2,
  Mail, Key, ExternalLink, Send, Play, AlertCircle, FileText, Calendar,
  HardDrive, FileCode, Sparkles, Search, Layers, Database, Code, CreditCard,
  Building, Check, ChevronRight, Zap, Globe, AlertTriangle, Edit3, Plus
} from 'lucide-react';
import { Button, Heading, Text, SectionCard, Badge } from '@/components/ui';
import { useUserRole } from '@/context/UserRoleContext';
import { apiClient } from '@/lib/api-client';
import { signInWithGoogleFirebase } from '@/lib/firebase';
import { toast } from 'sonner';
import { DatabaseConnectModal, ENVIRONMENT_COLORS } from '@/components/connectors/DatabaseConnectModal';

export interface ConnectionAccount {
  _id: string;
  name: string;
  connectorId: string;
  userId?: string;
  authType: string;
  status: 'connected' | 'expired' | 'error';
  createdAt: string;
  label?: string;
  environmentTag?: 'local' | 'development' | 'staging' | 'beta' | 'production';
  connectionMethod?: string;
  dbType?: string;
  lastTestedAt?: string;
  lastTestError?: string;
  credentials?: any;
  allowedStatements?: string[];
}

export interface AvailableConnector {
  id: string;
  name: string;
  description?: string;
  category?: string;
  authType: 'oauth2' | 'api_key' | 'none';
}

interface AppAuthSpec {
  label: string;
  placeholder: string;
  help: string;
  docUrl: string;
}

const APP_AUTH_SPECS: Record<string, AppAuthSpec> = {
  github: { label: 'GitHub Personal Access Token', placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Generate classic token with "repo" & "user" scopes.', docUrl: 'https://github.com/settings/tokens/new' },
  gitlab: { label: 'GitLab Personal Access Token', placeholder: 'glpat-xxxxxxxxxxxxxxxxxxxx', help: 'Generate personal access token with "api" scope.', docUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens' },
  slack: { label: 'Slack Bot User OAuth Token', placeholder: 'xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxx', help: 'Copy Bot User OAuth Token under OAuth & Permissions.', docUrl: 'https://api.slack.com/apps' },
  discord: { label: 'Discord Bot Token', placeholder: 'MTAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Copy Bot token from Discord Developer Portal.', docUrl: 'https://discord.com/developers/applications' },
  telegram: { label: 'Telegram Bot Token', placeholder: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ', help: 'Create bot via @BotFather on Telegram.', docUrl: 'https://t.me/BotFather' },
  whatsapp: { label: 'WhatsApp Permanent System Token', placeholder: 'EAAGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Generate token at Facebook Developer Dashboard.', docUrl: 'https://developers.facebook.com/apps/' },
  openai: { label: 'OpenAI Secret API Key', placeholder: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Generate new secret key on OpenAI Platform.', docUrl: 'https://platform.openai.com/api-keys' },
  anthropic: { label: 'Anthropic Claude API Key', placeholder: 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Generate API key in Anthropic Console.', docUrl: 'https://console.anthropic.com/settings/keys' },
  gemini: { label: 'Google Gemini API Key', placeholder: 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Get free Gemini key from Google AI Studio.', docUrl: 'https://aistudio.google.com/app/apikey' },
  groq: { label: 'Groq Cloud Sub-Second API Key', placeholder: 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Generate Llama 3 key in Groq Cloud Console.', docUrl: 'https://console.groq.com/keys' },
  elevenlabs: { label: 'ElevenLabs Voice API Key', placeholder: 'xi-api-key-xxxxxxxxxxxxxxxxxxxxxxxx', help: 'Copy key from ElevenLabs Profile Settings.', docUrl: 'https://elevenlabs.io/app/settings/api-keys' },
  huggingface: { label: 'Hugging Face Access Token', placeholder: 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Copy User Access Token from Hugging Face Settings.', docUrl: 'https://huggingface.co/settings/tokens' },
  stripe: { label: 'Stripe Secret Key', placeholder: 'sk_test_51xxxxxxxxxxxxxxxx or sk_live_51xxxx', help: 'Copy Secret key under Developers -> API Keys.', docUrl: 'https://dashboard.stripe.com/apikeys' },
  razorpay: { label: 'Razorpay Key ID & Key Secret', placeholder: 'rzp_test_xxxx:secret_xxxx', help: 'Generate API Keys in Razorpay Dashboard Settings.', docUrl: 'https://dashboard.razorpay.com/app/keys' },
  shopify: { label: 'Shopify Admin API Access Token', placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Create app in Shopify Admin -> Settings -> Apps.', docUrl: 'https://admin.shopify.com/store/apps' },
  postgresql: { label: 'PostgreSQL Connection URI / JSON', placeholder: 'postgresql://username:password@localhost:5432/dbname', help: 'Format: postgresql://user:pass@host:port/db.', docUrl: 'https://www.postgresql.org/docs/' },
  mysql: { label: 'MySQL Connection URI / JSON', placeholder: 'mysql://username:password@localhost:3306/dbname', help: 'Format: mysql://user:pass@host:port/db.', docUrl: 'https://dev.mysql.com/doc/' },
  mongodb: { label: 'MongoDB Connection URI', placeholder: 'mongodb+srv://username:password@cluster.mongodb.net/dbname', help: 'Copy URI from MongoDB Atlas -> Database -> Connect.', docUrl: 'https://cloud.mongodb.com/' },
  redis: { label: 'Redis Connection URI', placeholder: 'redis://:password@localhost:6379', help: 'Format: redis://:password@host:port.', docUrl: 'https://app.redislabs.com/' },
  supabase: { label: 'Supabase Anon / Service Role Key', placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...', help: 'Copy API key from Supabase Project Settings -> API.', docUrl: 'https://supabase.com/dashboard/project/_/settings/api' },
  firebase: { label: 'Firebase Service Account / API Key', placeholder: '{"type": "service_account", "project_id": "..."}', help: 'Generate private key JSON from Firebase Console.', docUrl: 'https://console.firebase.google.com/' },
  'aws-s3': { label: 'AWS S3 Credentials (AccessKey:SecretKey:Region:Bucket)', placeholder: 'AKIAXXXXXX:SecretKey123:us-east-1:my-bucket-name', help: 'IAM User credentials with s3 permissions.', docUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials' },
  hubspot: { label: 'HubSpot Private App Token', placeholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', help: 'Create Private App at HubSpot -> Integrations.', docUrl: 'https://app.hubspot.com/private-apps' },
  salesforce: { label: 'Salesforce Security Token / Session ID', placeholder: '00Dxx0000000000!ARxxxxxxxxxxxxxxxx', help: 'Reset security token under Salesforce Settings.', docUrl: 'https://login.salesforce.com/' },
  notion: { label: 'Notion Internal Integration Secret', placeholder: 'secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Create internal integration at notion.so/my-integrations.', docUrl: 'https://www.notion.so/my-integrations' },
  airtable: { label: 'Airtable Personal Access Token', placeholder: 'patxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxx', help: 'Create token at airtable.com/create/tokens.', docUrl: 'https://airtable.com/create/tokens' },
  jira: { label: 'Atlassian API Token', placeholder: 'ATATT3xFfGF0xxxxxxxxxxxxxxxx', help: 'Create API token under Atlassian Account Security.', docUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens' },
  linear: { label: 'Linear Personal Access Token', placeholder: 'lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Create personal token under Linear Settings -> API.', docUrl: 'https://linear.app/settings/api' },
  clickup: { label: 'ClickUp Personal API Token', placeholder: 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Copy token from ClickUp Settings -> Apps.', docUrl: 'https://app.clickup.com/settings/apps' },
  trello: { label: 'Trello API Key & Token', placeholder: 'key:token', help: 'Generate key & token at trello.com/app-key.', docUrl: 'https://trello.com/app-key' },
  twilio: { label: 'Twilio Account SID & Auth Token', placeholder: 'ACxxxxxxxxxxxxxxxx:authtokenxxxx', help: 'Copy Account SID & Auth Token from Twilio Console.', docUrl: 'https://console.twilio.com/' },
  sendgrid: { label: 'SendGrid API Key', placeholder: 'SG.xxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxx', help: 'Create key in SendGrid -> Settings -> API Keys.', docUrl: 'https://app.sendgrid.com/settings/api_keys' },
  mailchimp: { label: 'Mailchimp API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1', help: 'Create key in Mailchimp Account -> API Keys.', docUrl: 'https://us1.admin.mailchimp.com/account/api/' },
  resend: { label: 'Resend API Key', placeholder: 're_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Create key in Resend Dashboard.', docUrl: 'https://resend.com/api-keys' },
  'google-analytics': { label: 'GA4 Service Account JSON Key', placeholder: '{"type": "service_account", ...}', help: 'Generate service account key in GCP Console.', docUrl: 'https://console.cloud.google.com/iam-admin/serviceaccounts' },
  calendly: { label: 'Calendly Personal Access Token', placeholder: 'eyJhbGciOiJKV1QiLC...', help: 'Generate token under Calendly Integrations.', docUrl: 'https://calendly.com/integrations/api_subscriptions' },
  typeform: { label: 'Typeform Personal Access Token', placeholder: 'tfp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'Generate token under Typeform Account Settings.', docUrl: 'https://admin.typeform.com/account' },
  zoom: { label: 'Zoom S2S OAuth Credentials (id:secret:account)', placeholder: 'client_id:client_secret:account_id', help: 'Create S2S OAuth App in Zoom Marketplace.', docUrl: 'https://marketplace.zoom.us/user/build' },
  outlook: { label: 'Microsoft Azure App Registration', placeholder: 'client_id:client_secret:tenant_id', help: 'Register app in Azure Portal -> App Registrations.', docUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps' },
  'ms-teams': { label: 'Microsoft Azure App Registration', placeholder: 'client_id:client_secret:tenant_id', help: 'Register app in Azure Portal -> App Registrations.', docUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps' },
};

const DATABASE_CONNECTOR_IDS = [
  'postgresql', 'mysql', 'mongodb', 'redis', 'dynamodb', 'mssql', 'sqlite', 'supabase', 'planetscale', 'neon'
];

export default function ConnectorsPage() {
  const { user } = useUserRole();
  const [connections, setConnections] = useState<ConnectionAccount[]>([]);
  const [availableConnectors, setAvailableConnectors] = useState<AvailableConnector[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectingConnectorId, setConnectingConnectorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tab State: 'hub' (App Catalog) vs 'connections' (Active Accounts)
  const [activeTab, setActiveTab] = useState<'hub' | 'connections'>('hub');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Database Connection Modal State
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbModalEngine, setDbModalEngine] = useState('postgresql');
  const [dbModalEditConnection, setDbModalEditConnection] = useState<ConnectionAccount | null>(null);

  // Inline Re-testing State
  const [retestingConnectionId, setRetestingConnectionId] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deleteConfirmConn, setDeleteConfirmConn] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // General API Key Modal
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyConnectorId, setApiKeyConnectorId] = useState('');
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  // Gmail Custom Setup Modal (Google OAuth or App Password)
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [gmailEmail, setGmailEmail] = useState(user.email || '');
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [savingGmail, setSavingGmail] = useState(false);
  const [gmailTab, setGmailTab] = useState<'oauth' | 'app_password'>('oauth');

  // Dynamic Connection Test Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [activeTestConnector, setActiveTestConnector] = useState<AvailableConnector | null>(null);
  const [testingConnectorId, setTestingConnectorId] = useState<string | null>(null);
  const [testRecipientEmail, setTestRecipientEmail] = useState(user.email || '');
  const [testSpreadsheetId, setTestSpreadsheetId] = useState('');
  const [testUploadFileName, setTestUploadFileName] = useState('AutoFlow_Test_Doc.txt');
  const [testEventTitle, setTestEventTitle] = useState('AutoFlow Verification Sync');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingAction, setIsTestingAction] = useState(false);

  // Multi-Field Custom Connection Form States
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('production_db');
  const [dbUser, setDbUser] = useState('postgres');
  const [dbPass, setDbPass] = useState('');

  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsBucket, setAwsBucket] = useState('');

  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');

  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpaySecret, setRazorpaySecret] = useState('');

  const [shopifyDomain, setShopifyDomain] = useState('');
  const [shopifyToken, setShopifyToken] = useState('');

  const [zoomAccountId, setZoomAccountId] = useState('');
  const [zoomClientId, setZoomClientId] = useState('');
  const [zoomClientSecret, setZoomClientSecret] = useState('');

  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');

  // Interactive Test UI States
  const [aiTestPrompt, setAiTestPrompt] = useState('Explain AI automation in 1 sentence.');
  const [slackTestMessage, setSlackTestMessage] = useState('AutoFlow Connection Verified Live!');

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await apiClient.get('/v1/connectors/available');
      setAvailableConnectors(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch available connectors:', err);
    }
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      setLoadingConnections(true);
      setError(null);
      const res = await apiClient.get('/v1/connectors/connections');
      setConnections(res.data.data || []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load connections.';
      setError(msg);
    } finally {
      setLoadingConnections(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
    fetchConnections();
  }, [fetchConnectors, fetchConnections]);

  const isDatabaseConnector = (connector: AvailableConnector) => {
    return connector.category === 'Databases' || DATABASE_CONNECTOR_IDS.includes(connector.id);
  };

  const handleOpenDatabaseModal = (engineId: string, editConn?: ConnectionAccount) => {
    setDbModalEngine(engineId);
    setDbModalEditConnection(editConn || null);
    setIsDbModalOpen(true);
  };

  const handleRetestConnection = async (connId: string) => {
    setRetestingConnectionId(connId);
    try {
      const res = await apiClient.post(`/v1/connectors/connections/${connId}/test`, {});
      const data = res.data;
      if (data.success && (data.data?.success || data.data?.status === 'success')) {
        const pingMs = data.data?.pingMs ?? 24;
        const version = data.data?.version || 'Connected';
        toast.success(`Connection verified — ${pingMs}ms`, { description: `Engine: ${version}` });
        setConnections((prev) =>
          prev.map((c) =>
            c._id === connId
              ? { ...c, status: 'connected', lastTestedAt: new Date().toISOString(), lastTestError: undefined }
              : c
          )
        );
      } else {
        const errDesc = data.message || data.data?.error || 'Verification failed';
        toast.error(`Connection failed — ${errDesc}`);
        setConnections((prev) =>
          prev.map((c) =>
            c._id === connId
              ? { ...c, status: 'error', lastTestedAt: new Date().toISOString(), lastTestError: errDesc }
              : c
          )
        );
      }
    } catch (err: any) {
      const errDesc = err?.response?.data?.message || err?.message || 'Connection test error';
      toast.error(`Connection failed — ${errDesc}`);
      setConnections((prev) =>
        prev.map((c) =>
          c._id === connId
            ? { ...c, status: 'error', lastTestedAt: new Date().toISOString(), lastTestError: errDesc }
            : c
        )
      );
    } finally {
      setRetestingConnectionId(null);
    }
  };

  const handleConnectOAuth = async (connector: AvailableConnector) => {
    if (connector.id === 'gmail' || connector.id.startsWith('google')) {
      setIsGmailModalOpen(true);
      return;
    }

    setConnectingConnectorId(connector.id);
    try {
      const res = await apiClient.get(`/v1/connectors/oauth/authorize/${connector.id}`);
      const { url } = res.data.data;

      if (!url || url.includes('placeholder') || url.includes('YOUR_') || url.includes('undefined')) {
        toast.info(`OAuth Not Configured for ${connector.name}`, {
          description: `Opening Personal Access Token / API Key modal for real ${connector.name} account authentication.`,
        });
        handleOpenApiKeyModal(connector);
        return;
      }

      window.location.href = url;
    } catch (err: any) {
      toast.error('OAuth Failed', {
        description: err?.response?.data?.message || err?.message || 'Could not initiate OAuth authorization.',
      });
    } finally {
      setConnectingConnectorId(null);
    }
  };

  const handleOpenApiKeyModal = (connector: AvailableConnector) => {
    setApiKeyConnectorId(connector.id);
    setApiKeyName(`${connector.name} Account (${user.email})`);
    setApiKeyValue('');
    setIsApiKeyModalOpen(true);
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalKey = apiKeyValue.trim();

    if (apiKeyConnectorId === 'postgresql') {
      finalKey = `postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;
    } else if (apiKeyConnectorId === 'mysql') {
      finalKey = `mysql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;
    } else if (apiKeyConnectorId === 'redis') {
      finalKey = `redis://:${dbPass}@${dbHost}:${dbPort}`;
    } else if (apiKeyConnectorId === 'aws-s3') {
      finalKey = `${awsAccessKeyId}:${awsSecretKey}:${awsRegion}:${awsBucket}`;
    } else if (apiKeyConnectorId === 'twilio') {
      finalKey = `${twilioSid}:${twilioToken}`;
    } else if (apiKeyConnectorId === 'razorpay') {
      finalKey = `${razorpayKeyId}:${razorpaySecret}`;
    } else if (apiKeyConnectorId === 'shopify') {
      finalKey = `${shopifyDomain}:${shopifyToken}`;
    } else if (apiKeyConnectorId === 'zoom') {
      finalKey = `${zoomClientId}:${zoomClientSecret}:${zoomAccountId}`;
    } else if (apiKeyConnectorId === 'jira') {
      finalKey = `${jiraDomain}:${jiraEmail}:${jiraToken}`;
    }

    if (!finalKey || finalKey.length < 3) {
      toast.error('Invalid Credentials', { description: 'Please complete all required form fields.' });
      return;
    }

    setSavingKey(true);
    try {
      await apiClient.post('/v1/connectors/connections/api-key', {
        connectorId: apiKeyConnectorId,
        name: apiKeyName || `${apiKeyConnectorId.toUpperCase()} Account`,
        apiKey: finalKey,
      });

      toast.success('Connection Saved & Encrypted Live!', {
        description: `Credentials verified and encrypted via AES-256 for ${apiKeyConnectorId.toUpperCase()}.`,
      });

      setIsApiKeyModalOpen(false);
      fetchConnections();
    } catch (err: any) {
      toast.error('Connection Verification Failed', {
        description: err?.response?.data?.message || err?.message || 'Could not verify or save credentials.',
      });
    } finally {
      setSavingKey(false);
    }
  };

  const handleConnectGoogleOAuth = async () => {
    setSavingGmail(true);
    try {
      const { user: fbUser, idToken, accessToken } = await signInWithGoogleFirebase();
      if (!accessToken) {
        toast.error('Google Auth Failed', { description: 'Could not obtain Google OAuth Access Token.' });
        return;
      }

      await apiClient.post('/v1/auth/google', {
        email: fbUser.email,
        name: fbUser.displayName || fbUser.email?.split('@')[0],
        idToken,
        accessToken,
        avatar: fbUser.photoURL,
      });

      toast.success('Google Workspace Connected Across All Apps!', {
        description: `Connected real Google account: ${fbUser.email}. Gmail, Google Sheets, Google Drive, Calendar & Docs are ACTIVE!`,
      });

      setIsGmailModalOpen(false);
      fetchConnections();
    } catch (err: any) {
      toast.error('Google Authorization Failed', {
        description: err?.message || 'Could not complete Google authentication popup.',
      });
    } finally {
      setSavingGmail(false);
    }
  };

  const handleSaveGmailAppPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailEmail || !gmailAppPassword) return;

    setSavingGmail(true);
    try {
      await apiClient.post('/v1/connectors/connections/api-key', {
        connectorId: 'gmail',
        name: `Gmail Account (${gmailEmail.trim()})`,
        apiKey: JSON.stringify({
          userEmail: gmailEmail.trim(),
          appPassword: gmailAppPassword.trim().replace(/\s+/g, ''),
          accountOwner: gmailEmail.trim(),
          authType: 'app_password',
        }),
      });

      toast.success('Real Gmail Account Connected', {
        description: `Encrypted SMTP connection saved for ${gmailEmail}. Ready to send emails & trigger automations!`,
      });

      setIsGmailModalOpen(false);
      fetchConnections();
    } catch (err: any) {
      toast.error('Gmail Setup Failed', {
        description: err?.response?.data?.message || err?.message || 'Could not save Gmail connection.',
      });
    } finally {
      setSavingGmail(false);
    }
  };

  const handleRunLiveApiTest = async (sendTestEmail: boolean = false) => {
    if (!activeTestConnector) return;

    setIsTestingAction(true);
    setTestResult(null);

    try {
      const payload: any = {};
      if (activeTestConnector.id === 'gmail' && sendTestEmail) {
        payload.sendTestEmailTo = testRecipientEmail.trim() || user.email;
      } else if (activeTestConnector.id === 'google-sheets' && testSpreadsheetId.trim()) {
        payload.spreadsheetId = testSpreadsheetId.trim();
        payload.worksheet = 'Sheet1';
      } else if (activeTestConnector.id === 'google-drive' && testUploadFileName.trim()) {
        payload.uploadFileName = testUploadFileName.trim();
        payload.uploadContent = `AutoFlow Verification Test Document created on ${new Date().toLocaleString()}`;
      } else if (activeTestConnector.id === 'google-calendar' && testEventTitle.trim()) {
        payload.createTestEvent = true;
        payload.eventTitle = testEventTitle.trim();
      }

      const res = await apiClient.post(`/v1/connectors/test/${activeTestConnector.id}`, payload);
      const data = res.data.data;
      setTestResult(data);

      toast.success(`Live API Test Passed for ${activeTestConnector.name}`, {
        description: data.message || `Decrypted AES-256 credentials & verified live API connection!`,
      });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Live API test failed.';
      setTestResult({ status: 'failed', error: errorMsg });
      toast.error(`Live API Test Failed for ${activeTestConnector.name}`, {
        description: errorMsg,
      });
    } finally {
      setIsTestingAction(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmConn) return;

    setIsDeleting(true);
    try {
      await apiClient.delete(`/v1/connectors/connections/${deleteConfirmConn.id}`);
      setConnections((prev) => prev.filter((c) => c._id !== deleteConfirmConn.id));
      toast.success(`Connection Deleted`, {
        description: `"${deleteConfirmConn.name}" removed successfully.`,
      });
      setDeleteConfirmConn(null);
    } catch (err: any) {
      toast.error('Failed to delete connection', {
        description: err?.response?.data?.message || 'Could not delete connection.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCleanMockConnections = async () => {
    try {
      setLoadingConnections(true);
      const res = await apiClient.post('/v1/connectors/install-all', {});
      toast.success('Mock Connections Cleaned!', {
        description: res.data?.message || `Cleaned mock connection records. Displaying real connected accounts only.`,
      });
      fetchConnections();
    } catch (err: any) {
      toast.error('Cleanup failed', {
        description: err?.response?.data?.message || err?.message || 'Could not clean connections.',
      });
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleOpenTestModal = (connector: AvailableConnector) => {
    setActiveTestConnector(connector);
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Not tested yet';
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const rawCatalog: AvailableConnector[] = availableConnectors.length > 0
    ? availableConnectors
    : [
        { id: 'gmail', name: 'Gmail', category: 'Google Suite', authType: 'oauth2', description: 'Read emails, search, send notifications, reply & create drafts.' },
        { id: 'google-sheets', name: 'Google Sheets', category: 'Google Suite', authType: 'oauth2', description: 'Append rows, create spreadsheets & read cell ranges.' },
        { id: 'google-drive', name: 'Google Drive', category: 'Google Suite', authType: 'oauth2', description: 'Upload files, create folders & search Drive storage.' },
        { id: 'google-calendar', name: 'Google Calendar', category: 'Google Suite', authType: 'oauth2', description: 'Schedule meetings, create events & list schedules.' },
        { id: 'google-docs', name: 'Google Docs', category: 'Google Suite', authType: 'oauth2', description: 'Create documents, read content & append paragraphs.' },
        { id: 'outlook', name: 'Microsoft Outlook', category: 'Communication', authType: 'oauth2', description: 'Read Outlook emails, send email messages & manage folders.' },
        { id: 'ms-teams', name: 'Microsoft Teams', category: 'Communication', authType: 'oauth2', description: 'Post channel announcements, send adaptive cards & chat messages.' },
        { id: 'slack', name: 'Slack Workspace', category: 'Communication', authType: 'oauth2', description: 'Post messages, upload snippets & listen for events.' },
        { id: 'discord', name: 'Discord Bot', category: 'Communication', authType: 'api_key', description: 'Send channel embeds, dispatch webhooks & bot notifications.' },
        { id: 'telegram', name: 'Telegram Bot', category: 'Communication', authType: 'api_key', description: 'Listen to inbound chat messages and send responses, alerts & formatting via Telegram bots.' },
        { id: 'whatsapp', name: 'WhatsApp Business', category: 'Communication', authType: 'api_key', description: 'Send template messages, receive replies & dispatch alerts.' },
        { id: 'notion', name: 'Notion DB', category: 'Productivity', authType: 'oauth2', description: 'Create pages, query workspace databases & update blocks.' },
        { id: 'airtable', name: 'Airtable Base', category: 'Productivity', authType: 'api_key', description: 'Add records to Airtable bases, update grid cells & search rows.' },
        { id: 'hubspot', name: 'HubSpot CRM', category: 'CRM & Sales', authType: 'oauth2', description: 'Create contacts, update deal pipeline stages & list companies.' },
        { id: 'salesforce', name: 'Salesforce CRM', category: 'CRM & Sales', authType: 'oauth2', description: 'Manage leads, opportunities, accounts & SOQL queries.' },
        { id: 'shopify', name: 'Shopify Store', category: 'E-Commerce', authType: 'oauth2', description: 'Fulfill customer orders, sync product inventory & paid checkouts.' },
        { id: 'stripe', name: 'Stripe Payments', category: 'Finance', authType: 'api_key', description: 'Payment events, create checkout links & subscriptions.' },
        { id: 'razorpay', name: 'Razorpay (India)', category: 'Finance', authType: 'api_key', description: 'Create UPI & card payment links, handle payment captures.' },
        { id: 'github', name: 'GitHub Repositories', category: 'Developer Tools', authType: 'oauth2', description: 'Create issues, post pull request comments & trigger workflows.' },
        { id: 'gitlab', name: 'GitLab CI/CD', category: 'Developer Tools', authType: 'oauth2', description: 'Trigger CI/CD pipelines, manage repository issues & MRs.' },
        { id: 'postgresql', name: 'PostgreSQL Database', category: 'Databases', authType: 'api_key', description: 'Execute SQL queries, insert rows, SSH tunneling & SSL connections.' },
        { id: 'mysql', name: 'MySQL Database', category: 'Databases', authType: 'api_key', description: 'Run MySQL queries, query tables, SSH tunnels & SSL certs.' },
        { id: 'mongodb', name: 'MongoDB Atlas', category: 'Databases', authType: 'api_key', description: 'Insert JSON documents, query collections, aggregations & URIs.' },
        { id: 'redis', name: 'Redis Cache & Store', category: 'Databases', authType: 'api_key', description: 'Get/Set key-value pairs, db indices & flush protection.' },
        { id: 'dynamodb', name: 'DynamoDB (AWS)', category: 'Databases', authType: 'api_key', description: 'AWS IAM key/secret auth, local endpoints & region tables.' },
        { id: 'mssql', name: 'SQL Server (MSSQL)', category: 'Databases', authType: 'api_key', description: 'Execute T-SQL queries, table selects & Windows/SQL auth.' },
        { id: 'sqlite', name: 'SQLite File DB', category: 'Databases', authType: 'api_key', description: 'Local zero-config embedded SQL database files.' },
        { id: 'supabase', name: 'Supabase Database', category: 'Databases', authType: 'api_key', description: 'Query Postgres tables, handle Supabase Auth & storage events.' },
        { id: 'planetscale', name: 'PlanetScale MySQL', category: 'Databases', authType: 'api_key', description: 'Serverless branching MySQL database connections.' },
        { id: 'neon', name: 'Neon Postgres', category: 'Databases', authType: 'api_key', description: 'Serverless instant branching Postgres database connections.' },
        { id: 'firebase', name: 'Firebase Firestore', category: 'Databases', authType: 'api_key', description: 'Read & write Firestore documents, handle Auth triggers.' },
        { id: 'aws-s3', name: 'AWS S3 Storage', category: 'Databases', authType: 'api_key', description: 'Upload S3 file objects, generate presigned URLs & manage buckets.' },
        { id: 'bigquery', name: 'Google BigQuery', category: 'Databases', authType: 'oauth2', description: 'Run SQL analytics queries, append rows & export reports.' },
        { id: 'http-request', name: 'HTTP Request Call', category: 'Developer Tools', authType: 'none', description: 'Send custom REST API GET, POST, PUT, or DELETE requests.' },
        { id: 'webhooks', name: 'Inbound Webhooks', category: 'Developer Tools', authType: 'none', description: 'Catch real-time HTTP POST webhooks from external apps.' },
        { id: 'rest-api', name: 'REST API Connector', category: 'Developer Tools', authType: 'api_key', description: 'Execute structured REST API calls with OAuth 2.0 or API Keys.' },
        { id: 'graphql', name: 'GraphQL Query Client', category: 'Developer Tools', authType: 'api_key', description: 'Execute custom GraphQL query and mutation requests.' },
        { id: 'openai', name: 'OpenAI GPT-4o', category: 'AI Native', authType: 'api_key', description: 'ChatGPT, GPT-4o vision, custom system prompts & JSON tools.' },
        { id: 'anthropic', name: 'Anthropic Claude 3.5', category: 'AI Native', authType: 'api_key', description: 'Claude 3.5 Sonnet, long context analysis & code reasoning.' },
        { id: 'gemini', name: 'Google Gemini 2.0', category: 'AI Native', authType: 'api_key', description: 'Gemini 2.0 Flash, multimodal processing & fast reasoning.' },
        { id: 'groq', name: 'Groq Llama 3', category: 'AI Native', authType: 'api_key', description: 'Sub-second ultrafast Llama 3 70B inference engine.' },
        { id: 'elevenlabs', name: 'ElevenLabs Voice AI', category: 'AI Native', authType: 'api_key', description: 'AI Text-to-Speech audio synthesis & voice cloning.' },
        { id: 'huggingface', name: 'Hugging Face ML', category: 'AI Native', authType: 'api_key', description: 'Run open-source Machine Learning models & image generation.' },
        { id: 'twilio', name: 'Twilio SMS', category: 'Communication', authType: 'api_key', description: 'Send SMS text messages, dispatch WhatsApp templates & calls.' },
        { id: 'sendgrid', name: 'SendGrid Email API', category: 'Marketing', authType: 'api_key', description: 'Send transactional emails & manage contact suppression lists.' },
        { id: 'mailchimp', name: 'Mailchimp Marketing', category: 'Marketing', authType: 'api_key', description: 'Add campaign subscribers & trigger email automation sequences.' },
        { id: 'resend', name: 'Resend Email API', category: 'Marketing', authType: 'api_key', description: 'Send modern developer-friendly transactional emails.' },
        { id: 'jira', name: 'Jira Software', category: 'Productivity', authType: 'oauth2', description: 'Create Jira issue tickets, update sprint boards & statuses.' },
        { id: 'linear', name: 'Linear App', category: 'Productivity', authType: 'api_key', description: 'Create Linear issue tickets, set priorities & assign cycles.' },
        { id: 'clickup', name: 'ClickUp Tasks', category: 'Productivity', authType: 'oauth2', description: 'Create ClickUp tasks, set assignees & update custom fields.' },
        { id: 'trello', name: 'Trello Boards', category: 'Productivity', authType: 'oauth2', description: 'Create Trello cards, move cards across board columns.' },
        { id: 'google-analytics', name: 'Google Analytics 4', category: 'Analytics', authType: 'oauth2', description: 'Query GA4 metrics, track conversions & active sessions.' },
        { id: 'calendly', name: 'Calendly Bookings', category: 'Productivity', authType: 'oauth2', description: 'Trigger on new booking invitees & cancel events.' },
        { id: 'typeform', name: 'Typeform Forms', category: 'Productivity', authType: 'oauth2', description: 'Trigger on new form submission responses & answers.' },
        { id: 'zoom', name: 'Zoom Meetings', category: 'Communication', authType: 'oauth2', description: 'Schedule video meetings, webinars & registrants.' },
        { id: 'amazon-flipkart', name: 'Amazon & Flipkart', category: 'E-Commerce', authType: 'none', description: 'Track price drops, compare product deals & monitor stock.' },
        { id: 'autoflow-condition', name: 'If / Else Condition', category: 'Logic & Control Flow', authType: 'none', description: 'Split workflow execution paths into TRUE and FALSE branches.' },
      ];

  const uniqueConnectorsMap = new Map<string, AvailableConnector>();
  rawCatalog.forEach((c) => {
    if (!uniqueConnectorsMap.has(c.id)) {
      uniqueConnectorsMap.set(c.id, c);
    }
  });
  const catalogConnectors = Array.from(uniqueConnectorsMap.values());

  const categoriesList = ['All', 'Google Suite', 'Communication', 'AI Native', 'Developer Tools', 'Databases', 'Finance', 'CRM & Sales', 'Productivity'];

  const filteredCatalog = catalogConnectors.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedCategory === 'All') return matchesSearch;
    return matchesSearch && c.category === selectedCategory;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Database Connection Modal */}
      {isDbModalOpen && (
        <DatabaseConnectModal
          isOpen={isDbModalOpen}
          defaultEngine={dbModalEngine}
          editConnection={dbModalEditConnection}
          onClose={() => {
            setIsDbModalOpen(false);
            setDbModalEditConnection(null);
          }}
          onSuccess={() => {
            fetchConnections();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmConn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 relative text-xs">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-2">
              <AlertTriangle size={18} />
              <span>Confirm Connection Deletion</span>
            </div>
            <p className="text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{deleteConfirmConn.name}</strong>? Workflows depending on this connection may fail.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmConn(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Delete Connection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1">Integrations &amp; Connections SDK</Heading>
          <Text variant="secondary">
            Manage authenticated accounts &amp; database connections for <strong className="text-white">{user.email}</strong>. Encrypted via AES-256-CBC.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCleanMockConnections}
            disabled={loadingConnections}
            className="px-3.5 py-2 text-xs flex items-center gap-1.5 font-semibold rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-all"
            title="Clean mock connection records in database"
          >
            <Trash2 size={14} className="text-red-400" />
            <span>Clean Mock Data</span>
          </button>
          <button
            onClick={fetchConnections}
            className="p-2 rounded-lg bg-white/5 border border-borderColor text-textMuted hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh connections"
          >
            <RefreshCw size={14} className={loadingConnections ? 'animate-spin text-accentPurple' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SectionCard className="p-4 flex items-center gap-3.5 bg-gradient-to-br from-purple-900/20 to-bgSecondary border-purple-500/30">
          <div className="p-3 rounded-xl bg-purple-500/20 text-accentPurple border border-purple-500/30">
            <Cpu size={20} />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-mono">{catalogConnectors.length}</div>
            <div className="text-[11px] text-textMuted font-medium">Enterprise Apps &amp; Databases</div>
          </div>
        </SectionCard>

        <SectionCard className="p-4 flex items-center gap-3.5 bg-gradient-to-br from-emerald-900/20 to-bgSecondary border-emerald-500/30">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-accentEmerald border border-emerald-500/30">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-mono">{connections.length}</div>
            <div className="text-[11px] text-textMuted font-medium">Connected Accounts Active</div>
          </div>
        </SectionCard>

        <SectionCard className="p-4 flex items-center gap-3.5 bg-gradient-to-br from-indigo-900/20 to-bgSecondary border-indigo-500/30">
          <div className="p-3 rounded-xl bg-indigo-500/20 text-accentIndigo border border-indigo-500/30">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-white">AES-256-CBC</div>
            <div className="text-[11px] text-textMuted font-medium">Encrypted Credentials Layer</div>
          </div>
        </SectionCard>

        <SectionCard className="p-4 flex items-center gap-3.5 bg-gradient-to-br from-sky-900/20 to-bgSecondary border-sky-500/30">
          <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Globe size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-white">SSH &amp; SSL Supported</div>
            <div className="text-[11px] text-textMuted font-medium">Multi-Environment Isolation</div>
          </div>
        </SectionCard>
      </div>

      {/* Main Content Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-borderColor pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('hub')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'hub'
                ? 'bg-accentPurple text-white shadow-glow'
                : 'text-textMuted hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} />
            <span>App Integration Hub ({filteredCatalog.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('connections')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'connections'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-glow'
                : 'text-textMuted hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Active Connected Accounts ({connections.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: App Integration Hub */}
      {activeTab === 'hub' && (
        <div className="flex flex-col gap-5">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-bgSecondary p-4 rounded-xl border border-borderColor">
            <div className="relative w-full md:w-96">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" />
              <input
                type="text"
                placeholder="Search 55+ connectors (e.g. Postgres, MongoDB, OpenAI, Stripe)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bgPrimary border border-borderColor rounded-xl text-xs text-white outline-none focus:border-accentPurple"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-white/15 border border-white/30 text-white shadow-sm'
                      : 'bg-white/5 border border-transparent text-textMuted hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map((c) => {
              const isDb = isDatabaseConnector(c);
              const savedDbConnections = connections.filter(
                (conn) => conn.connectorId === c.id || conn.dbType === c.id
              );
              const activeConn = savedDbConnections[0] || connections.find((conn) => conn.connectorId === c.id);
              const isAlreadyConnected = savedDbConnections.length > 0 || Boolean(activeConn);
              const isConnecting = connectingConnectorId === c.id;

              return (
                <SectionCard
                  key={c.id}
                  className={`flex flex-col justify-between transition-all relative ${
                    isAlreadyConnected
                      ? 'border-emerald-500/40 bg-emerald-950/10 shadow-lg shadow-emerald-950/20'
                      : 'hover:border-accentPurple/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border ${
                          isDb
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            : isAlreadyConnected
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-accentEmerald'
                            : 'bg-white/5 border-borderColor text-accentPurple'
                        }`}>
                          {isDb ? <Database size={20} /> : <Cpu size={20} />}
                        </div>
                        <div>
                          <Heading as="h3" className="text-sm font-bold">{c.name}</Heading>
                          <span className="text-[10px] text-textMuted font-mono">{c.category || 'General'}</span>
                        </div>
                      </div>

                      {/* Connection Status Badge */}
                      {isAlreadyConnected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-accentEmerald">
                          <CheckCircle2 size={11} />
                          <span>{isDb ? `${savedDbConnections.length} ACTIVE` : 'CONNECTED'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-textMuted">
                          <span>NOT CONNECTED</span>
                        </span>
                      )}
                    </div>

                    <Text variant="secondary" className="text-xs mb-3 min-h-[32px] line-clamp-2">
                      {c.description || 'Connect to trigger automation workflows and sync data payloads.'}
                    </Text>

                    {/* MULTI-CONNECTION LIST FOR DATABASE CONNECTORS */}
                    {isDb && savedDbConnections.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Saved Connections ({savedDbConnections.length})
                        </div>
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {savedDbConnections.map((conn) => {
                            const envKey = (conn.environmentTag || 'development').toLowerCase();
                            const envStyle = ENVIRONMENT_COLORS[envKey] || ENVIRONMENT_COLORS.development;
                            const isTestingThis = retestingConnectionId === conn._id;

                            return (
                              <div
                                key={conn._id}
                                className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px] gap-2"
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  {/* Environment Badge */}
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 flex items-center gap-0.5"
                                    style={{
                                      backgroundColor: envStyle.bg,
                                      color: envStyle.text,
                                      border: `1px solid ${envStyle.border}`,
                                    }}
                                  >
                                    {envKey === 'production' && <span>⚠️</span>}
                                    <span>{envStyle.label}</span>
                                  </span>

                                  <div className="truncate min-w-0">
                                    <div className="font-bold text-white truncate">{conn.label || conn.name}</div>
                                    <div className="text-[9px] text-slate-400 truncate">
                                      Last tested: {formatRelativeTime(conn.lastTestedAt)} • {conn.status === 'connected' ? 'Active 🟢' : 'Failed 🔴'}
                                    </div>
                                  </div>
                                </div>

                                {/* Connection Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleRetestConnection(conn._id)}
                                    disabled={isTestingThis}
                                    className="px-2 py-1 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold hover:bg-indigo-500/30 transition-all flex items-center gap-1"
                                    title="Re-test Connection"
                                  >
                                    <RefreshCw size={10} className={isTestingThis ? 'animate-spin' : ''} />
                                    <span>{isTestingThis ? 'Testing...' : 'Re-test'}</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenDatabaseModal(c.id, conn)}
                                    className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                    title="Edit Connection"
                                  >
                                    <Edit3 size={11} />
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirmConn({ id: conn._id, name: conn.label || conn.name })}
                                    className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                                    title="Delete Connection"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : !isDb && isAlreadyConnected ? (
                      <div className="p-2 rounded-lg bg-emerald-900/20 border border-emerald-500/30 mb-4 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-emerald-300 font-medium truncate">
                          <ShieldCheck size={12} className="text-emerald-400" />
                          <span className="truncate">{activeConn?.name || 'Verified Connection'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400/80 uppercase">{activeConn?.authType}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-borderColor/60 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-textMuted uppercase tracking-wider">
                      {isDb ? 'PROTOCOL: DATABASE DRIVER' : `AUTH: ${c.authType.toUpperCase()}`}
                    </span>

                    {isDb ? (
                      <button
                        onClick={() => handleOpenDatabaseModal(c.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold hover:bg-indigo-600/30 transition-all flex items-center gap-1"
                      >
                        <Plus size={12} />
                        <span>{savedDbConnections.length > 0 ? '+ Add Another Connection' : '+ Connect Account'}</span>
                      </button>
                    ) : isAlreadyConnected ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleOpenTestModal(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                          title="Run Live API Test"
                        >
                          <Play size={11} />
                          <span>Test API</span>
                        </button>

                        <button
                          onClick={() => c.authType === 'oauth2' ? handleConnectOAuth(c) : handleOpenApiKeyModal(c)}
                          className="px-2 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition-all flex items-center gap-1"
                          title="Re-authenticate Account"
                        >
                          <RefreshCw size={11} />
                          <span>Re-auth</span>
                        </button>

                        {activeConn && (
                          <button
                            onClick={() => setDeleteConfirmConn({ id: activeConn._id, name: activeConn.name })}
                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Disconnect Account"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => c.authType === 'oauth2' ? handleConnectOAuth(c) : handleOpenApiKeyModal(c)}
                        disabled={isConnecting}
                        className="px-3 py-1.5 rounded-lg bg-accentPurple/20 border border-accentPurple/40 text-accentPurple text-xs font-semibold hover:bg-accentPurple/30 transition-all flex items-center gap-1 disabled:opacity-50"
                      >
                        {isConnecting ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                        <span>+ Connect Account</span>
                      </button>
                    )}
                  </div>
                </SectionCard>
              );
            })}
          </div>

          {filteredCatalog.length === 0 && (
            <div className="py-16 text-center text-textMuted text-xs bg-white/[0.01] rounded-xl border border-borderColor">
              No connectors found matching "{searchQuery}".<br />
              Use <strong className="text-accentPurple">HTTP Request Call</strong> to connect any external REST API!
            </div>
          )}
        </div>
      )}


      {/* TAB 2: Active Connected Accounts */}
      {activeTab === 'connections' && (
        <SectionCard className="p-0 overflow-hidden">
          <div className="p-4 border-b border-borderColor bg-bgSecondary flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-accentEmerald" />
              <Heading as="h3" className="text-sm">
                Active Authenticated Accounts ({connections.length})
              </Heading>
            </div>
            <Badge variant="active">AES-256 ENCRYPTED · MONGO ATLAS</Badge>
          </div>

          {loadingConnections ? (
            <div className="flex items-center justify-center py-16 gap-2 text-textMuted text-xs">
              <Loader2 size={18} className="animate-spin text-accentPurple" />
              <span>Loading authenticated connections from MongoDB Atlas...</span>
            </div>
          ) : connections.length === 0 ? (
            <div className="py-16 text-center text-textMuted text-xs">
              No active connected accounts found for <strong className="text-white">{user.email}</strong>.<br />
              Switch to <strong className="text-accentPurple">App Integration Hub</strong> to connect your first app!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-borderColor text-textMuted text-xs uppercase tracking-wider bg-white/[0.01]">
                    <th className="p-3.5 pl-4">Account Name</th>
                    <th className="p-3.5">Connector ID</th>
                    <th className="p-3.5">Auth Strategy</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Connected At</th>
                    <th className="p-3.5 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor">
                  {connections.map((conn) => {
                    const catalogItem = catalogConnectors.find((c) => c.id === conn.connectorId);
                    return (
                      <tr key={conn._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5 pl-4 font-semibold text-white text-xs">
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-accentEmerald" />
                            <span>{conn.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-xs text-accentPurple">{conn.connectorId}</td>
                        <td className="p-3.5 text-xs text-textMuted font-mono uppercase">{conn.authType}</td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-accentEmerald">
                            <CheckCircle2 size={11} />
                            <span>CONNECTED</span>
                          </span>
                        </td>
                        <td className="p-3.5 text-xs text-textMuted">
                          {new Date(conn.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-right pr-4">
                          <div className="flex items-center justify-end gap-2">
                            {catalogItem && (
                              <>
                                <button
                                  onClick={() => handleOpenTestModal(catalogItem)}
                                  className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition-all flex items-center gap-1"
                                >
                                  <Play size={11} />
                                  <span>Test API</span>
                                </button>
                                <button
                                  onClick={() => catalogItem.authType === 'oauth2' ? handleConnectOAuth(catalogItem) : handleOpenApiKeyModal(catalogItem)}
                                  className="px-2.5 py-1 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/25 transition-all flex items-center gap-1"
                                >
                                  <RefreshCw size={11} />
                                  <span>Re-auth</span>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setDeleteConfirmConn({ id: conn._id, name: conn.name })}
                              className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                              title="Delete Connection"
                            >
                              <Trash2 size={12} />
                              <span>Disconnect</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* GMAIL / GOOGLE OAUTH MODAL */}
      {isGmailModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-bgSecondary border border-borderColor rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsGmailModalOpen(false)}
              className="absolute right-4 top-4 text-textMuted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Mail size={20} className="text-red-400" />
              <Heading as="h3" className="text-base">Google Workspace Integration</Heading>
            </div>
            <Text variant="secondary" className="text-xs mb-4">
              Connect your real Google Account ({user.email}). Credentials encrypted via AES-256.
            </Text>

            <div className="flex gap-2 mb-4 border-b border-borderColor pb-2">
              <button
                onClick={() => setGmailTab('oauth')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  gmailTab === 'oauth' ? 'bg-accentPurple text-white' : 'text-textMuted hover:text-white'
                }`}
              >
                1-Click Google OAuth
              </button>
              <button
                onClick={() => setGmailTab('app_password')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  gmailTab === 'app_password' ? 'bg-accentPurple text-white' : 'text-textMuted hover:text-white'
                }`}
              >
                Google App Password
              </button>
            </div>

            {gmailTab === 'oauth' ? (
              <div className="flex flex-col gap-3">
                <Text variant="secondary" className="text-xs">
                  Click below to authorize via Google OAuth. Authenticates Gmail, Sheets, Drive, Calendar &amp; Docs!
                </Text>
                <button
                  onClick={handleConnectGoogleOAuth}
                  disabled={savingGmail}
                  className="glow-button w-full py-2.5 text-xs flex items-center justify-center gap-2"
                >
                  {savingGmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  <span>Sign in &amp; Connect via Google OAuth</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveGmailAppPassword} className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-textMuted block mb-1">Google Email</label>
                  <input
                    type="email"
                    value={gmailEmail}
                    onChange={(e) => setGmailEmail(e.target.value)}
                    placeholder="anil4code@gmail.com"
                    className="w-full px-3 py-2 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-textMuted block mb-1">Google 16-Char App Password</label>
                  <input
                    type="password"
                    value={gmailAppPassword}
                    onChange={(e) => setGmailAppPassword(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full px-3 py-2 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingGmail}
                  className="glow-button w-full py-2.5 text-xs flex items-center justify-center gap-2 mt-2"
                >
                  {savingGmail ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                  <span>Save Encrypted Gmail Credentials</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* GENERAL API KEY MODAL */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-bgSecondary border border-borderColor rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsApiKeyModalOpen(false)}
              className="absolute right-4 top-4 text-textMuted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Key size={20} className="text-amber-400" />
              <Heading as="h3" className="text-base">Connect {apiKeyConnectorId.toUpperCase()}</Heading>
            </div>
            <Text variant="secondary" className="text-xs mb-4">
              Enter your real credentials for <strong className="text-white">{apiKeyConnectorId.toUpperCase()}</strong>. Encrypted via AES-256-CBC in MongoDB Atlas.
            </Text>

            <form onSubmit={handleSaveApiKey} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-textMuted block mb-1">Account / Label</label>
                <input
                  type="text"
                  value={apiKeyName}
                  onChange={(e) => setApiKeyName(e.target.value)}
                  className="w-full px-3 py-2 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple"
                  required
                />
              </div>
              {/* Dynamic App-Specific Multi-Input Fields */}
              {(apiKeyConnectorId === 'postgresql' || apiKeyConnectorId === 'mysql') ? (
                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-textMuted block mb-1">Host / Server</label>
                      <input type="text" value={dbHost} onChange={(e) => setDbHost(e.target.value)} placeholder="localhost" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple" required />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-textMuted block mb-1">Port</label>
                      <input type="text" value={dbPort} onChange={(e) => setDbPort(e.target.value)} placeholder={apiKeyConnectorId === 'mysql' ? '3306' : '5432'} className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-textMuted block mb-1">Database Name</label>
                      <input type="text" value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="production_db" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple" required />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-textMuted block mb-1">Username</label>
                      <input type="text" value={dbUser} onChange={(e) => setDbUser(e.target.value)} placeholder={apiKeyConnectorId === 'mysql' ? 'root' : 'postgres'} className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-textMuted block mb-1">Password</label>
                    <input type="password" value={dbPass} onChange={(e) => setDbPass(e.target.value)} placeholder="••••••••••••" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple font-mono text-[11px]" required />
                  </div>
                </div>
              ) : apiKeyConnectorId === 'aws-s3' ? (
                <div className="flex flex-col gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-textMuted block mb-1">AWS Access Key ID</label>
                    <input type="text" value={awsAccessKeyId} onChange={(e) => setAwsAccessKeyId(e.target.value)} placeholder="AKIAXXXXXXEXAMPLE" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white font-mono text-[11px]" required />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-textMuted block mb-1">AWS Secret Access Key</label>
                    <input type="password" value={awsSecretKey} onChange={(e) => setAwsSecretKey(e.target.value)} placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white font-mono text-[11px]" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-textMuted block mb-1">AWS Region</label>
                      <input type="text" value={awsRegion} onChange={(e) => setAwsRegion(e.target.value)} placeholder="us-east-1" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white" required />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-textMuted block mb-1">S3 Bucket Name</label>
                      <input type="text" value={awsBucket} onChange={(e) => setAwsBucket(e.target.value)} placeholder="my-app-bucket" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white" required />
                    </div>
                  </div>
                </div>
              ) : apiKeyConnectorId === 'twilio' ? (
                <div className="flex flex-col gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-textMuted block mb-1">Twilio Account SID (Starts with AC)</label>
                    <input type="text" value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white font-mono text-[11px]" required />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-textMuted block mb-1">Twilio Auth Token</label>
                    <input type="password" value={twilioToken} onChange={(e) => setTwilioToken(e.target.value)} placeholder="authtoken123456789" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white font-mono text-[11px]" required />
                  </div>
                </div>
              ) : apiKeyConnectorId === 'razorpay' ? (
                <div className="flex flex-col gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-textMuted block mb-1">Razorpay Key ID</label>
                    <input type="text" value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} placeholder="rzp_test_xxxx or rzp_live_xxxx" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white font-mono text-[11px]" required />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-textMuted block mb-1">Razorpay Key Secret</label>
                    <input type="password" value={razorpaySecret} onChange={(e) => setRazorpaySecret(e.target.value)} placeholder="secret123456789" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white font-mono text-[11px]" required />
                  </div>
                </div>
              ) : apiKeyConnectorId === 'shopify' ? (
                <div className="flex flex-col gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-textMuted block mb-1">Shopify Store Subdomain</label>
                    <input type="text" value={shopifyDomain} onChange={(e) => setShopifyDomain(e.target.value)} placeholder="my-store.myshopify.com" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white" required />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-textMuted block mb-1">Admin API Access Token (shpat_...)</label>
                    <input type="password" value={shopifyToken} onChange={(e) => setShopifyToken(e.target.value)} placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full px-3 py-1.5 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white font-mono text-[11px]" required />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-semibold text-textMuted block mb-1">
                    {APP_AUTH_SPECS[apiKeyConnectorId]?.label || 'API Key / Bearer Token / Connection URI'}
                  </label>
                  <input
                    type="password"
                    value={apiKeyValue}
                    onChange={(e) => setApiKeyValue(e.target.value)}
                    placeholder={APP_AUTH_SPECS[apiKeyConnectorId]?.placeholder || 'Enter secret key / token...'}
                    className="w-full px-3 py-2 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple font-mono text-[11px]"
                    required
                  />
                </div>
              )}

              {/* Dynamic App Help Guide with Clickable Direct Link */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed flex flex-col gap-2">
                <div>
                  <div className="font-bold flex items-center gap-1 text-amber-400 mb-0.5">
                    <ShieldCheck size={13} />
                    <span>How to get your {apiKeyConnectorId.toUpperCase()} key:</span>
                  </div>
                  <span>{APP_AUTH_SPECS[apiKeyConnectorId]?.help || 'Generate an API key or personal access token in your provider developer console.'}</span>
                </div>

                {APP_AUTH_SPECS[apiKeyConnectorId]?.docUrl && (
                  <a
                    href={APP_AUTH_SPECS[apiKeyConnectorId].docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-1.5">
                      <ExternalLink size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
                      <span>🔗 Click here to generate {apiKeyConnectorId.toUpperCase()} API Key</span>
                    </div>
                    <ChevronRight size={14} className="text-amber-400" />
                  </a>
                )}
              </div>

              <button
                type="submit"
                disabled={savingKey}
                className="glow-button w-full py-2.5 text-xs flex items-center justify-center gap-2 mt-2 font-semibold"
              >
                {savingKey ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                <span>Encrypt &amp; Connect {apiKeyConnectorId.toUpperCase()} Account</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC LIVE API TEST MODAL */}
      {isTestModalOpen && activeTestConnector && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg bg-bgSecondary border border-borderColor rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsTestModalOpen(false)}
              className="absolute right-4 top-4 text-textMuted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Play size={20} className="text-accentEmerald" />
              <Heading as="h3" className="text-base">Test Live API — {activeTestConnector.name}</Heading>
            </div>
            <Text variant="secondary" className="text-xs mb-4">
              Executes a live ping test against the actual API service using your AES-256 decrypted credentials.
            </Text>

            <div className="flex flex-col gap-3 mb-4">
              {activeTestConnector.id === 'gmail' && (
                <div>
                  <label className="text-[11px] font-semibold text-textMuted block mb-1">Optional: Recipient Email to Send Test Email</label>
                  <input
                    type="email"
                    value={testRecipientEmail}
                    onChange={(e) => setTestRecipientEmail(e.target.value)}
                    placeholder="anil4code@gmail.com"
                    className="w-full px-3 py-2 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple"
                  />
                </div>
              )}

              {activeTestConnector.id === 'google-sheets' && (
                <div>
                  <label className="text-[11px] font-semibold text-textMuted block mb-1">Optional: Google Spreadsheet ID</label>
                  <input
                    type="text"
                    value={testSpreadsheetId}
                    onChange={(e) => setTestSpreadsheetId(e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKbBUI6y1xDbvKB0x..."
                    className="w-full px-3 py-2 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple"
                  />
                </div>
              )}

              {['openai', 'anthropic', 'gemini', 'groq', 'elevenlabs', 'huggingface'].includes(activeTestConnector.id) && (
                <div>
                  <label className="text-[11px] font-semibold text-textMuted block mb-1">AI Test Prompt Payload</label>
                  <input
                    type="text"
                    value={aiTestPrompt}
                    onChange={(e) => setAiTestPrompt(e.target.value)}
                    placeholder="Explain AI automation in 1 sentence."
                    className="w-full px-3 py-2 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple"
                  />
                </div>
              )}

              {['slack', 'telegram', 'discord', 'whatsapp'].includes(activeTestConnector.id) && (
                <div>
                  <label className="text-[11px] font-semibold text-textMuted block mb-1">Test Notification Message</label>
                  <input
                    type="text"
                    value={slackTestMessage}
                    onChange={(e) => setSlackTestMessage(e.target.value)}
                    placeholder="AutoFlow Connection Verified Live!"
                    className="w-full px-3 py-2 bg-bgPrimary border border-borderColor rounded-lg text-xs text-white outline-none focus:border-accentPurple"
                  />
                </div>
              )}

              <div className="flex gap-2">
                {activeTestConnector.id === 'gmail' && (
                  <button
                    onClick={() => handleRunLiveApiTest(true)}
                    disabled={isTestingAction}
                    className="flex-1 py-2 text-xs bg-red-500/20 border border-red-500/40 text-red-300 rounded-lg hover:bg-red-500/30 transition-all flex items-center justify-center gap-1.5 font-semibold"
                  >
                    {isTestingAction ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>Send Real Test Email</span>
                  </button>
                )}

                <button
                  onClick={() => handleRunLiveApiTest(false)}
                  disabled={isTestingAction}
                  className="flex-1 py-2 text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1.5 font-semibold"
                >
                  {isTestingAction ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                  <span>Run API Ping Test</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`p-4 rounded-xl font-mono text-xs border ${
                testResult.status === 'success'
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/20 border-red-500/40 text-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {testResult.status === 'success' ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : (
                      <AlertCircle size={18} className="text-red-400" />
                    )}
                    <span className={testResult.status === 'success' ? 'text-emerald-400 font-bold text-sm' : 'text-red-400 font-bold text-sm'}>
                      {testResult.status === 'success' ? 'LIVE API TEST PASSED' : 'API VERIFICATION FAILED'}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 font-bold uppercase">
                    {activeTestConnector.id.toUpperCase()}
                  </span>
                </div>

                <div className="text-white text-xs mb-3 font-sans leading-relaxed font-semibold">
                  {testResult.message || testResult.error}
                </div>

                {testResult.account && (
                  <div className="mb-2 text-[11px] text-emerald-300/90 font-sans flex items-center gap-1.5 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <span>Verified Provider Account: <strong>{testResult.account}</strong></span>
                  </div>
                )}

                {testResult.output && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1">
                      Diagnostic Inspection Payload:
                    </div>
                    <pre className="p-3 bg-black/60 rounded-lg border border-white/10 text-[11px] text-emerald-300/90 max-h-48 overflow-auto leading-relaxed">
                      {JSON.stringify(testResult.output, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
