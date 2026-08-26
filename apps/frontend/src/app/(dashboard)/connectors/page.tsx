'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Lock, Trash2, ShieldCheck, X, Loader2, RefreshCw, CheckCircle2, Mail, Key, ExternalLink, Send, Play, AlertCircle, FileText, Calendar, HardDrive, FileCode } from 'lucide-react';
import { Button, Heading, Text, SectionCard, Badge } from '@/components/ui';
import { useUserRole } from '@/context/UserRoleContext';
import { apiClient } from '@/lib/api-client';
import { signInWithGoogleFirebase } from '@/lib/firebase';
import { toast } from 'sonner';

export interface ConnectionAccount {
  _id: string;
  name: string;
  connectorId: string;
  userId?: string;
  authType: string;
  status: 'connected' | 'expired';
  createdAt: string;
}

export interface AvailableConnector {
  id: string;
  name: string;
  description?: string;
  authType: 'oauth2' | 'api_key' | 'none';
}

export default function ConnectorsPage() {
  const { user } = useUserRole();
  const [connections, setConnections] = useState<ConnectionAccount[]>([]);
  const [availableConnectors, setAvailableConnectors] = useState<AvailableConnector[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectingConnectorId, setConnectingConnectorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        toast.error(`Real ${connector.name} OAuth Not Configured`, {
          description: `To connect your real ${connector.name} account, add ${connector.id.toUpperCase()}_CLIENT_ID and ${connector.id.toUpperCase()}_CLIENT_SECRET in apps/backend/.env file.`,
          duration: 6000,
        });
        setConnectingConnectorId(null);
        return;
      }

      window.location.href = url;
    } catch (err: any) {
      toast.error(`OAuth Redirect Failed`, {
        description: err?.response?.data?.message || `Could not initiate OAuth for ${connector.name}. Check backend environment keys.`,
      });
    } finally {
      setConnectingConnectorId(null);
    }
  };

  const handleConnectGmailFirebase = async () => {
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
      setGmailAppPassword('');
      fetchConnections();
    } catch (err: any) {
      toast.error('Failed to Connect Gmail', {
        description: err?.response?.data?.message || 'Could not save Gmail connection.',
      });
    } finally {
      setSavingGmail(false);
    }
  };

  const handleOpenApiKeyModal = (connector: AvailableConnector) => {
    setApiKeyConnectorId(connector.id);
    setApiKeyName(`${connector.name} Key`);
    setApiKeyValue('');
    setIsApiKeyModalOpen(true);
  };

  const handleAddApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyName || !apiKeyValue || !apiKeyConnectorId) return;
    setSavingKey(true);
    try {
      await apiClient.post('/v1/connectors/connections/api-key', {
        connectorId: apiKeyConnectorId,
        name: apiKeyName.trim(),
        apiKey: apiKeyValue.trim(),
      });
      toast.success('API Key Connection Encrypted & Saved', {
        description: `Credentials encrypted with AES-256-CBC and stored in MongoDB.`,
      });
      setIsApiKeyModalOpen(false);
      setApiKeyValue('');
      fetchConnections();
    } catch (err: any) {
      toast.error('Failed to Save API Key', {
        description: err?.response?.data?.message || 'Could not save API key.',
      });
    } finally {
      setSavingKey(false);
    }
  };

  const handleDelete = async (conn: ConnectionAccount) => {
    try {
      await apiClient.delete(`/v1/connectors/connections/${conn._id}`);
      setConnections((prev) => prev.filter((c) => c._id !== conn._id));
      toast.error('Connection Revoked', {
        description: `"${conn.name}" removed and tokens deleted from database.`,
      });
    } catch (err: any) {
      toast.error('Delete Failed', {
        description: err?.response?.data?.message || 'Could not revoke connection.',
      });
    }
  };

  const handleTestConnection = async (connectorId: string, customParams?: any) => {
    setTestingConnectorId(connectorId);
    setIsTestingAction(true);

    try {
      const res = await apiClient.post(`/v1/connectors/test/${connectorId}`, customParams || {});
      const data = res.data.data;
      setTestResult(data);

      toast.success(`${connectorId.toUpperCase()} Connection Live & Verified!`, {
        description: data.message || `Successfully tested ${connectorId} connection.`,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || `Failed to verify ${connectorId} connection.`;
      toast.error('Connection Test Failed', { description: msg });
      setTestResult({ status: 'failed', error: msg });
    } finally {
      setTestingConnectorId(null);
      setIsTestingAction(false);
    }
  };

  const handleOpenTestModal = (connector: AvailableConnector) => {
    setActiveTestConnector(connector);
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const catalogConnectors: AvailableConnector[] = availableConnectors.length > 0
    ? availableConnectors
    : [
        { id: 'gmail', name: 'Gmail', authType: 'oauth2', description: 'Read emails, search, send notifications, reply & create drafts.' },
        { id: 'google-sheets', name: 'Google Sheets', authType: 'oauth2', description: 'Append rows, create spreadsheets & read cell ranges.' },
        { id: 'google-drive', name: 'Google Drive', authType: 'oauth2', description: 'Upload files, create folders & search Drive storage.' },
        { id: 'google-calendar', name: 'Google Calendar', authType: 'oauth2', description: 'Schedule meetings, create events & list schedules.' },
        { id: 'google-docs', name: 'Google Docs', authType: 'oauth2', description: 'Create documents, read content & append paragraphs.' },
        { id: 'slack', name: 'Slack', authType: 'oauth2', description: 'Post messages & listen for events.' },
        { id: 'stripe', name: 'Stripe', authType: 'oauth2', description: 'Payment events & subscriptions.' },
        { id: 'notion', name: 'Notion DB', authType: 'oauth2', description: 'Create pages & query workspace.' },
        { id: 'whatsapp', name: 'WhatsApp Business', authType: 'oauth2', description: 'Send & receive messages.' },
        { id: 'web-search', name: 'Web Search', authType: 'api_key', description: 'Live web search & scraper.' },
        { id: 'ai-node', name: 'AI Processor Node', authType: 'none', description: 'LLM summarization & extraction.' },
      ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1">Connector SDK &amp; Connections</Heading>
          <Text variant="secondary">
            Authenticated accounts for <strong className="text-white">{user.email}</strong>. Credentials encrypted via AES-256.
          </Text>
        </div>
        <button
          onClick={fetchConnections}
          className="p-2 rounded-lg bg-white/5 border border-borderColor text-textMuted hover:text-white transition-colors flex items-center gap-1.5 text-xs"
          title="Refresh connections"
        >
          <RefreshCw size={14} className={loadingConnections ? 'animate-spin' : ''} />
          <span>Refresh Connections</span>
        </button>
      </div>

      {/* Connectors Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalogConnectors.map((c) => {
          const isConnecting = connectingConnectorId === c.id;
          const activeConn = connections.find((conn) => conn.connectorId === c.id);
          const isAlreadyConnected = Boolean(activeConn);

          return (
            <SectionCard
              key={c.id}
              className={`flex flex-col justify-between transition-all relative ${
                isAlreadyConnected
                  ? 'border-emerald-500/40 bg-emerald-950/10 shadow-lg shadow-emerald-950/20'
                  : 'hover:border-accentPurple'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu size={22} className={isAlreadyConnected ? 'text-accentEmerald' : 'text-accentIndigo'} />
                    <Heading as="h3" className="text-sm font-bold">{c.name}</Heading>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isAlreadyConnected ? (
                      <span className="flex items-center gap-1 text-[10px] text-accentEmerald font-semibold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} />
                        CONNECTED
                      </span>
                    ) : (
                      <Badge variant={c.authType === 'oauth2' ? 'active' : c.authType === 'none' ? 'info' : 'draft'}>
                        {c.authType.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>

                <Text variant="secondary" className="text-xs mb-3">{c.description}</Text>

                {/* Account Details Box when Connected */}
                {isAlreadyConnected && activeConn && (
                  <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex flex-col gap-1">
                    <div className="flex items-center justify-between font-semibold text-emerald-300">
                      <span className="truncate max-w-[180px]" title={activeConn.name}>
                        {activeConn.name || user.email}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
                        {activeConn.authType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400/80 font-mono">
                      <Lock size={10} />
                      <span>AES-256 Encrypted · Live API Verified</span>
                    </div>
                  </div>
                )}
              </div>

              {c.authType === 'none' ? (
                <Button variant="secondary" size="sm" disabled className="w-full">
                  Native Node Active
                </Button>
              ) : isAlreadyConnected ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenTestModal(c)}
                      className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5"
                    >
                      <Play size={13} />
                      <span>Test {c.name} API</span>
                    </Button>
                    <button
                      onClick={() => activeConn && handleDelete(activeConn)}
                      className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Revoke Connection"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleConnectOAuth(c)}
                    className="text-[11px] text-textMuted hover:text-white text-center underline"
                  >
                    Re-authenticate {c.name}
                  </button>
                </div>
              ) : c.authType === 'oauth2' ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isConnecting}
                  onClick={() => handleConnectOAuth(c)}
                  className="w-full"
                >
                  {isConnecting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Authenticating...</span>
                    </span>
                  ) : (
                    `Connect ${c.name}`
                  )}
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => handleOpenApiKeyModal(c)} className="w-full">
                  Add API Key
                </Button>
              )}
            </SectionCard>
          );
        })}
      </div>

      {/* Active Connections List */}
      <SectionCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-accentEmerald" />
            <Heading as="h3">
              Active Encrypted Connections ({connections.length})
            </Heading>
          </div>
          <Badge variant="active">LIVE · AES-256 · MONGODB</Badge>
        </div>

        {loadingConnections ? (
          <div className="flex items-center justify-center py-10 gap-2 text-textMuted text-xs">
            <Loader2 size={16} className="animate-spin text-accentPurple" />
            <span>Loading connections from database...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400 text-xs">
            {error}
            <br />
            <button onClick={fetchConnections} className="mt-2 text-accentPurple hover:underline">Retry</button>
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-10 text-textMuted text-xs bg-white/[0.01] rounded-xl border border-dashed border-borderColor">
            No active connections for <strong className="text-white">{user.email}</strong>.<br />
            Click &quot;Connect&quot; on any connector above to authenticate.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {connections.map((conn) => {
              const matchedCatalog = catalogConnectors.find((c) => c.id === conn.connectorId) || {
                id: conn.connectorId,
                name: conn.name,
                authType: conn.authType as any,
              };

              return (
                <div
                  key={conn._id}
                  className="flex items-center justify-between p-3.5 px-4 rounded-md bg-white/[0.02] border border-borderColor hover:border-accentPurple transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-accentEmerald" />
                    <div>
                      <div className="font-semibold text-sm text-white">{conn.name}</div>
                      <div className="text-xs text-textSecondary font-mono">
                        {conn.connectorId} · {conn.authType} · Added {new Date(conn.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenTestModal(matchedCatalog)}
                      className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1"
                    >
                      <Play size={11} />
                      <span>Test {conn.connectorId}</span>
                    </button>
                    <Badge variant={conn.status === 'connected' ? 'active' : 'failed'}>
                      {conn.status.toUpperCase()}
                    </Badge>
                    <button
                      onClick={() => handleDelete(conn)}
                      className="text-textMuted hover:text-accentRose transition-colors p-1"
                      title="Revoke Connection"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Dynamic Connection Verification Modal */}
      {isTestModalOpen && activeTestConnector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <SectionCard className="w-full max-w-lg border-emerald-500/40 relative bg-bgSecondary">
            <button
              onClick={() => setIsTestModalOpen(false)}
              className="absolute right-4 top-4 text-textMuted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="text-emerald-400" size={22} />
              </div>
              <div>
                <Heading as="h3">Test {activeTestConnector.name} API Connection</Heading>
                <Text variant="secondary" className="text-xs">
                  Verify live API access and permissions for <strong>{user.email}</strong>.
                </Text>
              </div>
            </div>

            {/* DYNAMIC TEST ACTIONS BASED ON CONNECTOR ID */}
            {activeTestConnector.id === 'gmail' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-borderColor rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Mail size={14} className="text-accentIndigo" />
                        <span>1. Check Inbox Access (Read API)</span>
                      </div>
                      <div className="text-[11px] text-textMuted mt-0.5">Queries your Gmail inbox using real Google REST API.</div>
                    </div>
                    <Button
                      size="sm"
                      disabled={testingConnectorId === 'gmail'}
                      onClick={() => handleTestConnection('gmail')}
                      className="shrink-0 text-xs"
                    >
                      {testingConnectorId === 'gmail' && !isTestingAction ? <Loader2 size={12} className="animate-spin" /> : 'Verify Inbox'}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-borderColor rounded-xl mb-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Send size={14} className="text-accentEmerald" />
                    <span>2. Send Real Test Email</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="email"
                      placeholder="recipient@example.com"
                      value={testRecipientEmail}
                      onChange={(e) => setTestRecipientEmail(e.target.value)}
                      className="flex-1 bg-bgPrimary border border-borderColor rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-accentEmerald"
                    />
                    <Button
                      size="sm"
                      disabled={isTestingAction || !testRecipientEmail}
                      onClick={() => handleTestConnection('gmail', { sendTestEmailTo: testRecipientEmail })}
                      className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {isTestingAction ? <Loader2 size={12} className="animate-spin" /> : 'Send Email'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTestConnector.id === 'google-drive' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-borderColor rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <HardDrive size={14} className="text-accentIndigo" />
                        <span>1. Search &amp; List Drive Storage</span>
                      </div>
                      <div className="text-[11px] text-textMuted mt-0.5">Queries Google Drive REST API to list your files.</div>
                    </div>
                    <Button
                      size="sm"
                      disabled={testingConnectorId === 'google-drive'}
                      onClick={() => handleTestConnection('google-drive')}
                      className="shrink-0 text-xs"
                    >
                      {testingConnectorId === 'google-drive' && !isTestingAction ? <Loader2 size={12} className="animate-spin" /> : 'List Files'}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-borderColor rounded-xl mb-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Send size={14} className="text-accentEmerald" />
                    <span>2. Upload Sample Test File</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="text"
                      placeholder="File Name (e.g. TestDoc.txt)"
                      value={testUploadFileName}
                      onChange={(e) => setTestUploadFileName(e.target.value)}
                      className="flex-1 bg-bgPrimary border border-borderColor rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-accentEmerald"
                    />
                    <Button
                      size="sm"
                      disabled={isTestingAction || !testUploadFileName}
                      onClick={() => handleTestConnection('google-drive', { uploadFileName: testUploadFileName })}
                      className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {isTestingAction ? <Loader2 size={12} className="animate-spin" /> : 'Upload File'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTestConnector.id === 'google-sheets' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-borderColor rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FileText size={14} className="text-accentIndigo" />
                        <span>1. Create New Test Spreadsheet</span>
                      </div>
                      <div className="text-[11px] text-textMuted mt-0.5">Creates a real Google Sheet in your account.</div>
                    </div>
                    <Button
                      size="sm"
                      disabled={testingConnectorId === 'google-sheets'}
                      onClick={() => handleTestConnection('google-sheets')}
                      className="shrink-0 text-xs"
                    >
                      {testingConnectorId === 'google-sheets' && !isTestingAction ? <Loader2 size={12} className="animate-spin" /> : 'Create Sheet'}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-borderColor rounded-xl mb-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Send size={14} className="text-accentEmerald" />
                    <span>2. Append Test Row to Existing Sheet</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="text"
                      placeholder="Spreadsheet ID or Google Sheet Link"
                      value={testSpreadsheetId}
                      onChange={(e) => setTestSpreadsheetId(e.target.value)}
                      className="flex-1 bg-bgPrimary border border-borderColor rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-accentEmerald"
                    />
                    <Button
                      size="sm"
                      disabled={isTestingAction || !testSpreadsheetId}
                      onClick={() => handleTestConnection('google-sheets', { spreadsheetId: testSpreadsheetId })}
                      className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {isTestingAction ? <Loader2 size={12} className="animate-spin" /> : 'Append Row'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTestConnector.id === 'google-calendar' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-borderColor rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Calendar size={14} className="text-accentIndigo" />
                        <span>1. List Upcoming Calendar Meetings</span>
                      </div>
                      <div className="text-[11px] text-textMuted mt-0.5">Queries Google Calendar API for upcoming events.</div>
                    </div>
                    <Button
                      size="sm"
                      disabled={testingConnectorId === 'google-calendar'}
                      onClick={() => handleTestConnection('google-calendar')}
                      className="shrink-0 text-xs"
                    >
                      {testingConnectorId === 'google-calendar' && !isTestingAction ? <Loader2 size={12} className="animate-spin" /> : 'List Meetings'}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-borderColor rounded-xl mb-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Send size={14} className="text-accentEmerald" />
                    <span>2. Create Test Event</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="text"
                      placeholder="Event Title"
                      value={testEventTitle}
                      onChange={(e) => setTestEventTitle(e.target.value)}
                      className="flex-1 bg-bgPrimary border border-borderColor rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-accentEmerald"
                    />
                    <Button
                      size="sm"
                      disabled={isTestingAction || !testEventTitle}
                      onClick={() => handleTestConnection('google-calendar', { createTestEvent: true, eventTitle: testEventTitle })}
                      className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {isTestingAction ? <Loader2 size={12} className="animate-spin" /> : 'Create Event'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTestConnector.id === 'google-docs' && (
              <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-borderColor rounded-xl mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileCode size={14} className="text-accentIndigo" />
                      <span>Create Test Google Document</span>
                    </div>
                    <div className="text-[11px] text-textMuted mt-0.5">Creates a brand new Google Document via Google Docs REST API.</div>
                  </div>
                  <Button
                    size="sm"
                    disabled={testingConnectorId === 'google-docs'}
                    onClick={() => handleTestConnection('google-docs')}
                    className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {testingConnectorId === 'google-docs' ? <Loader2 size={12} className="animate-spin" /> : 'Create Document'}
                  </Button>
                </div>
              </div>
            )}

            {!activeTestConnector.id.startsWith('google') && activeTestConnector.id !== 'gmail' && (
              <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-borderColor rounded-xl mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-accentEmerald" />
                      <span>Verify {activeTestConnector.name} Connection</span>
                    </div>
                    <div className="text-[11px] text-textMuted mt-0.5">Verifies encrypted credentials in MongoDB for {user.email}.</div>
                  </div>
                  <Button
                    size="sm"
                    disabled={testingConnectorId === activeTestConnector.id}
                    onClick={() => handleTestConnection(activeTestConnector.id)}
                    className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {testingConnectorId === activeTestConnector.id ? <Loader2 size={12} className="animate-spin" /> : 'Verify API Token'}
                  </Button>
                </div>
              </div>
            )}

            {/* Live Verification Output Box */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex flex-col gap-1.5 font-mono animate-fadeIn ${
                  testResult.status === 'failed'
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {testResult.status === 'failed' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                    {testResult.status === 'failed' ? 'TEST FAILED' : 'LIVE API VERIFIED SUCCESS'}
                  </span>
                  <span className="text-[10px] text-gray-400">{new Date().toLocaleTimeString()}</span>
                </div>
                <div>{testResult.message || testResult.error}</div>
                {(testResult.error?.includes('console.developers.google.com') || testResult.message?.includes('console.developers.google.com') || testResult.error?.includes('has not been used in project')) && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-sans">
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-300">
                      <ExternalLink size={14} className="text-amber-400 shrink-0" />
                      <span>One-Time Action Required: Enable Google API</span>
                    </div>
                    <p className="text-[11px] text-amber-100/90 mb-2.5">
                      Your Google authentication is valid! Google Cloud requires turning ON the API for project <strong>728116182533</strong>. Click the button below, press <strong>&quot;ENABLE&quot;</strong>, then re-test.
                    </p>
                    <a
                      href={
                        testResult.error?.includes('sheets') || testResult.message?.includes('sheets')
                          ? "https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=728116182533"
                          : testResult.error?.includes('drive') || testResult.message?.includes('drive')
                          ? "https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=728116182533"
                          : testResult.error?.includes('calendar') || testResult.message?.includes('calendar')
                          ? "https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=728116182533"
                          : testResult.error?.includes('docs') || testResult.message?.includes('docs')
                          ? "https://console.developers.google.com/apis/api/docs.googleapis.com/overview?project=728116182533"
                          : "https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=728116182533"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-md"
                    >
                      <span>
                        Enable {activeTestConnector?.name} API on Google Cloud
                      </span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}
                {testResult.output && (
                  <pre className="mt-1 p-2 bg-black/40 rounded text-[10px] text-gray-300 overflow-x-auto max-h-32">
                    {JSON.stringify(testResult.output, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Real Gmail Setup Modal */}
      {isGmailModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <SectionCard className="w-full max-w-lg border-purple-500/40 relative bg-bgSecondary">
            <button
              onClick={() => setIsGmailModalOpen(false)}
              className="absolute right-4 top-4 text-textMuted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Mail className="text-red-400" size={20} />
              </div>
              <div>
                <Heading as="h3">Connect Real Google Account</Heading>
                <Text variant="secondary" className="text-xs">
                  Connect your real Gmail, Google Sheets, Google Drive, Calendar &amp; Docs accounts instantly.
                </Text>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-white/5 p-1 mb-5 border border-borderColor">
              <button
                type="button"
                onClick={() => setGmailTab('oauth')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  gmailTab === 'oauth'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-textMuted hover:text-white'
                }`}
              >
                1. Logged-in Google Account (1-Click)
              </button>
              <button
                type="button"
                onClick={() => setGmailTab('app_password')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  gmailTab === 'app_password'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-textMuted hover:text-white'
                }`}
              >
                2. Google App Password (SMTP)
              </button>
            </div>

            {gmailTab === 'oauth' ? (
              <div className="flex flex-col gap-4 py-2">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200">
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-purple-400" />
                    Connect Logged-in Account: <strong>{user.email}</strong>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    Authenticates directly via Google OAuth Popup to grant real Gmail, Google Sheets, Google Drive, Calendar, and Docs access tokens across all your workspace apps.
                  </p>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="secondary" onClick={() => setIsGmailModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={savingGmail}
                    onClick={handleConnectGmailFirebase}
                    className="flex items-center gap-2"
                  >
                    {savingGmail ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Connecting to Google...</span>
                      </>
                    ) : (
                      <span>Authorize Logged-in Account ({user.email})</span>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveGmailAppPassword} className="flex flex-col gap-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200">
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <Key size={14} className="text-purple-400" />
                    How to get a 16-character Google App Password:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-300">
                    <li>Go to your Google Account: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline inline-flex items-center gap-0.5">myaccount.google.com/apppasswords <ExternalLink size={10} /></a></li>
                    <li>Make sure 2-Step Verification is turned ON in Google Security.</li>
                    <li>Type App name &quot;AutoFlow Platform&quot; and click <strong>Create</strong>.</li>
                    <li>Copy the 16-character password below.</li>
                  </ol>
                </div>

                <div>
                  <label className="text-xs text-textSecondary font-medium mb-1 block">Your Gmail Address</label>
                  <input
                    type="email"
                    placeholder="user@gmail.com"
                    value={gmailEmail}
                    onChange={(e) => setGmailEmail(e.target.value)}
                    className="w-full bg-bgPrimary border border-borderColor rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-accentPurple"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-textSecondary font-medium mb-1 block">16-Digit Google App Password</label>
                  <input
                    type="password"
                    placeholder="abcd efgh ijkl mnop"
                    value={gmailAppPassword}
                    onChange={(e) => setGmailAppPassword(e.target.value)}
                    className="w-full bg-bgPrimary border border-borderColor rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-accentPurple"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <Button type="button" variant="secondary" onClick={() => setIsGmailModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingGmail}>
                    {savingGmail ? 'Encrypting & Saving...' : 'Connect Gmail Account'}
                  </Button>
                </div>
              </form>
            )}
          </SectionCard>
        </div>
      )}

      {/* API Key Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <SectionCard className="w-full max-w-md border-purple-500/40 relative">
            <button
              onClick={() => setIsApiKeyModalOpen(false)}
              className="absolute right-4 top-4 text-textMuted hover:text-white"
            >
              <X size={18} />
            </button>
            <Heading as="h3" className="mb-2">Add Encrypted API Key Connection</Heading>
            <Text variant="secondary" className="mb-4 text-xs">
              Credentials encrypted with AES-256-CBC and stored in MongoDB for {user.email}.
            </Text>
            <form onSubmit={handleAddApiKey} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-textSecondary font-medium mb-1 block">Connection Name</label>
                <input
                  type="text"
                  placeholder="e.g. Production Key"
                  value={apiKeyName}
                  onChange={(e) => setApiKeyName(e.target.value)}
                  className="w-full bg-bgSecondary border border-borderColor rounded px-3 py-2 text-sm text-white outline-none focus:border-accentPurple"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-textSecondary font-medium mb-1 block">Secret API Key</label>
                <input
                  type="password"
                  placeholder="tvly-... / sk-..."
                  value={apiKeyValue}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                  className="w-full bg-bgSecondary border border-borderColor rounded px-3 py-2 text-sm text-white outline-none focus:border-accentPurple"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button type="button" variant="secondary" onClick={() => setIsApiKeyModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingKey}>
                  {savingKey ? 'Encrypting...' : 'Encrypt & Save to MongoDB'}
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
