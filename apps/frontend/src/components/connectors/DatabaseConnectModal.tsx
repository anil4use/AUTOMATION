import React, { useState, useEffect } from 'react';
import { Database, Shield, Server, Terminal, Lock, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, AlertTriangle, X, HelpCircle, Key, Cpu } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export interface DatabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editConnection?: any;
  defaultEngine?: string;
}

export const DATABASE_ENGINES = [
  { id: 'postgresql', name: 'PostgreSQL', defaultPort: 5432, category: 'Relational', desc: 'Enterprise SQL database with JSONB support' },
  { id: 'mysql', name: 'MySQL', defaultPort: 3306, category: 'Relational', desc: 'Popular open-source relational database' },
  { id: 'mongodb', name: 'MongoDB', defaultPort: 27017, category: 'NoSQL', desc: 'Document-oriented database with flexible JSON' },
  { id: 'redis', name: 'Redis', defaultPort: 6379, category: 'In-Memory', desc: 'Ultra-fast in-memory key-value cache & store' },
  { id: 'dynamodb', name: 'DynamoDB', defaultPort: 8000, category: 'Managed Cloud', desc: 'AWS NoSQL key-value & document database' },
  { id: 'mssql', name: 'SQL Server (MSSQL)', defaultPort: 1433, category: 'Relational', desc: 'Microsoft relational database engine' },
  { id: 'supabase', name: 'Supabase', defaultPort: 5432, category: 'Managed Cloud', desc: 'Managed Postgres with realtime & auth' },
  { id: 'planetscale', name: 'PlanetScale', defaultPort: 3306, category: 'Managed Cloud', desc: 'Serverless MySQL database platform' },
  { id: 'neon', name: 'Neon Postgres', defaultPort: 5432, category: 'Managed Cloud', desc: 'Serverless branching Postgres' },
  { id: 'sqlite', name: 'SQLite', defaultPort: 0, category: 'Local File', desc: 'Embedded zero-config SQL database' },
];

export const ENVIRONMENT_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  local:       { bg: '#374151', text: '#9CA3AF', border: '#4B5563', label: 'Local' },
  development: { bg: '#1E3A5F', text: '#60A5FA', border: '#2563EB', label: 'Dev' },
  staging:     { bg: '#78350F', text: '#FCD34D', border: '#D97706', label: 'Staging' },
  beta:        { bg: '#7C2D12', text: '#FB923C', border: '#EA580C', label: 'Beta' },
  production:  { bg: '#7F1D1D', text: '#F87171', border: '#DC2626', label: 'Production' },
};

export const DatabaseConnectModal: React.FC<DatabaseConnectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editConnection,
  defaultEngine = 'postgresql',
}) => {
  const [selectedEngine, setSelectedEngine] = useState(defaultEngine);
  const [connectionMethod, setConnectionMethod] = useState<'fields' | 'uri' | 'ssh_tunnel' | 'ssl' | 'socket' | 'read_replica'>('fields');
  const [label, setLabel] = useState('');
  const [environmentTag, setEnvironmentTag] = useState<string>('development');
  const [readOnlyOnly, setReadOnlyOnly] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Connection fields
  const [connectionString, setConnectionString] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(5432);
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authDatabase, setAuthDatabase] = useState('admin');
  const [authMechanism, setAuthMechanism] = useState('DEFAULT');
  const [dbIndex, setDbIndex] = useState(0);

  // DynamoDB fields
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [endpointUrl, setEndpointUrl] = useState('');

  // Socket & Replica fields
  const [socketPath, setSocketPath] = useState('/var/run/postgresql/.s.PGSQL.5432');
  const [replicaHost, setReplicaHost] = useState('');
  const [replicaPort, setReplicaPort] = useState(5432);

  // SSH Tunnel fields
  const [enableSsh, setEnableSsh] = useState(false);
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState(22);
  const [sshUsername, setSshUsername] = useState('');
  const [sshAuthMethod, setSshAuthMethod] = useState<'password' | 'key'>('password');
  const [sshPassword, setSshPassword] = useState('');
  const [sshPrivateKey, setSshPrivateKey] = useState('');
  const [sshPassphrase, setSshPassphrase] = useState('');

  // SSL fields
  const [enableSsl, setEnableSsl] = useState(false);
  const [sslMode, setSslMode] = useState('require');
  const [sslCaCert, setSslCaCert] = useState('');
  const [sslClientCert, setSslClientCert] = useState('');
  const [sslClientKey, setSslClientKey] = useState('');
  const [rejectUnauthorized, setRejectUnauthorized] = useState(true);

  // Testing & Saving UI state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; pingMs?: number; version?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to invalidate test result whenever any input changes
  const updateInput = (setter: React.Dispatch<React.SetStateAction<any>>) => (val: any) => {
    setTestResult(null);
    setter(val);
  };

  useEffect(() => {
    if (editConnection) {
      setSelectedEngine(editConnection.dbType || editConnection.connectorId || 'postgresql');
      setLabel(editConnection.label || editConnection.name || '');
      setEnvironmentTag(editConnection.environmentTag || 'development');
      setReadOnlyOnly(Array.isArray(editConnection.allowedStatements) && editConnection.allowedStatements.includes('SELECT'));
      setConnectionMethod(editConnection.connectionMethod || 'fields');

      if (editConnection.credentials) {
        const c = editConnection.credentials;
        if (c.host) setHost(c.host);
        if (c.port) setPort(c.port);
        if (c.database) setDatabase(c.database);
        if (c.username) setUsername(c.username);
        if (c.authDatabase) setAuthDatabase(c.authDatabase);
        if (c.authMechanism) setAuthMechanism(c.authMechanism);
        if (c.dbIndex !== undefined) setDbIndex(c.dbIndex);
        if (c.connectionString) setConnectionString(c.connectionString);
        if (c.awsAccessKeyId) setAwsAccessKeyId(c.awsAccessKeyId);
        if (c.awsRegion) setAwsRegion(c.awsRegion);
        if (c.endpointUrl) setEndpointUrl(c.endpointUrl);
        if (c.socketPath) setSocketPath(c.socketPath);
        if (c.sshTunnel) {
          setEnableSsh(Boolean(c.sshTunnel.enabled));
          if (c.sshTunnel.host) setSshHost(c.sshTunnel.host);
          if (c.sshTunnel.port) setSshPort(c.sshTunnel.port);
          if (c.sshTunnel.username) setSshUsername(c.sshTunnel.username);
          if (c.sshTunnel.authMethod) setSshAuthMethod(c.sshTunnel.authMethod);
        }
        if (c.ssl) {
          setEnableSsl(Boolean(c.ssl.enabled));
          if (c.ssl.mode) setSslMode(c.ssl.mode);
        }
      }
    } else {
      const engine = DATABASE_ENGINES.find((e) => e.id === selectedEngine);
      if (engine) setPort(engine.defaultPort);
    }
  }, [editConnection]);

  useEffect(() => {
    if (!editConnection) {
      const engine = DATABASE_ENGINES.find((e) => e.id === selectedEngine);
      if (engine) setPort(engine.defaultPort);
    }
    setTestResult(null);
  }, [selectedEngine]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const isMaskedPassword = password.includes('••••••') || password === '';

    const payload: any = {
      dbType: selectedEngine,
      connectionMethod,
      connectionString: connectionString.trim() || undefined,
      host: host.trim(),
      port: Number(port),
      database: database.trim(),
      username: username.trim(),
      password: !isMaskedPassword && password.trim() ? password.trim() : undefined,
      authDatabase: authDatabase.trim(),
      authMechanism,
      dbIndex: Number(dbIndex),
      awsAccessKeyId: awsAccessKeyId.trim(),
      awsSecretAccessKey: awsSecretKey.trim() && !awsSecretKey.includes('••••••') ? awsSecretKey.trim() : undefined,
      awsRegion,
      endpointUrl: endpointUrl.trim() || undefined,
      socketPath: socketPath.trim(),
      replicaHost: replicaHost.trim(),
      replicaPort: Number(replicaPort),
      connectionId: editConnection?._id || editConnection?.id,
      sshTunnel: (enableSsh || connectionMethod === 'ssh_tunnel')
        ? {
            enabled: true,
            host: sshHost.trim(),
            port: Number(sshPort),
            username: sshUsername.trim(),
            authMethod: sshAuthMethod,
            password: sshAuthMethod === 'password' && sshPassword && !sshPassword.includes('••••••') ? sshPassword : undefined,
            privateKey: sshAuthMethod === 'key' && sshPrivateKey && !sshPrivateKey.includes('••••••') ? sshPrivateKey : undefined,
            passphrase: sshPassphrase.trim() || undefined,
          }
        : undefined,
      ssl: (enableSsl || connectionMethod === 'ssl')
        ? {
            enabled: true,
            mode: sslMode,
            caCert: sslCaCert && !sslCaCert.includes('••••••') ? sslCaCert : undefined,
            clientCert: sslClientCert && !sslClientCert.includes('••••••') ? sslClientCert : undefined,
            clientKey: sslClientKey && !sslClientKey.includes('••••••') ? sslClientKey : undefined,
            rejectUnauthorized,
          }
        : undefined,
    };

    try {
      const res = await apiClient.post('/v1/connectors/test-connection', payload);
      const data = res.data;

      if (data.success && (data.data?.success || data.data?.status === 'success')) {
        const pingMs = data.data?.pingMs ?? data.data?.latencyMs ?? 15;
        const version = data.data?.version || 'Connected';
        setTestResult({
          success: true,
          message: `Connection successful (${pingMs}ms)! Engine version: ${version}`,
          pingMs,
          version,
        });
        toast.success('Database Connection Verified!', { description: `Latency: ${pingMs}ms • Engine: ${version}` });
      } else {
        const errorMsg = data.message || data.data?.error || data.data?.message || 'Database connection failed.';
        setTestResult({
          success: false,
          message: errorMsg,
        });
        toast.error('Connection Test Failed', { description: errorMsg });
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Network error testing database connection.';
      setTestResult({
        success: false,
        message: errorMsg,
      });
      toast.error('Connection Test Failed', { description: errorMsg });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!testResult?.success) return;

    setIsSaving(true);
    const isMaskedPassword = password.includes('••••••') || password === '';
    const connectionId = editConnection?._id || editConnection?.id;

    const creds: any = connectionMethod === 'uri'
      ? { connectionString: connectionString.trim() }
      : {
          host: host.trim(),
          port: Number(port),
          database: database.trim(),
          username: username.trim(),
          authDatabase: authDatabase.trim(),
          authMechanism,
          dbIndex: Number(dbIndex),
          awsAccessKeyId: awsAccessKeyId.trim(),
          awsRegion,
          endpointUrl: endpointUrl.trim() || undefined,
          socketPath: socketPath.trim(),
          replicaHost: replicaHost.trim(),
          replicaPort: Number(replicaPort),
        };

    if (!isMaskedPassword && password.trim()) {
      creds.password = password.trim();
    }
    if (awsSecretKey.trim() && !awsSecretKey.includes('••••••')) {
      creds.awsSecretAccessKey = awsSecretKey.trim();
    }

    if (enableSsh || connectionMethod === 'ssh_tunnel') {
      creds.sshTunnel = {
        enabled: true,
        host: sshHost.trim(),
        port: Number(sshPort),
        username: sshUsername.trim(),
        authMethod: sshAuthMethod,
        passphrase: sshPassphrase.trim() || undefined,
      };
      if (sshAuthMethod === 'password' && sshPassword && !sshPassword.includes('••••••')) {
        creds.sshTunnel.password = sshPassword;
      }
      if (sshAuthMethod === 'key' && sshPrivateKey && !sshPrivateKey.includes('••••••')) {
        creds.sshTunnel.privateKey = sshPrivateKey;
      }
    }

    if (enableSsl || connectionMethod === 'ssl') {
      creds.ssl = {
        enabled: true,
        mode: sslMode,
        rejectUnauthorized,
      };
      if (sslCaCert && !sslCaCert.includes('••••••')) creds.ssl.caCert = sslCaCert;
      if (sslClientCert && !sslClientCert.includes('••••••')) creds.ssl.clientCert = sslClientCert;
      if (sslClientKey && !sslClientKey.includes('••••••')) creds.ssl.clientKey = sslClientKey;
    }

    const payload = {
      connectorId: selectedEngine,
      name: label.trim() || `${selectedEngine.toUpperCase()} (${environmentTag.toUpperCase()})`,
      label: label.trim() || `${selectedEngine.toUpperCase()} (${environmentTag.toUpperCase()})`,
      environmentTag,
      connectionMethod,
      dbType: selectedEngine,
      allowedStatements: readOnlyOnly ? ['SELECT'] : undefined,
      credentials: creds,
    };

    try {
      if (connectionId) {
        await apiClient.put(`/v1/connectors/connections/${connectionId}`, payload);
        toast.success('Database Connection Updated!', { description: `Saved changes for ${payload.name}` });
      } else {
        await apiClient.post('/v1/connectors/connections/api-key', {
          connectorId: selectedEngine,
          name: payload.name,
          label: payload.label,
          environmentTag: payload.environmentTag,
          connectionMethod: payload.connectionMethod,
          dbType: payload.dbType,
          allowedStatements: payload.allowedStatements,
          apiKey: JSON.stringify(payload.credentials),
        });
        toast.success('Database Connection Created!', { description: `Encrypted AES-256 connection active for ${payload.name}` });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to Save Connection', { description: err?.response?.data?.message || err?.message || 'Error saving database connection.' });
    } finally {
      setIsSaving(false);
    }
  };

  const activeEnvStyle = ENVIRONMENT_COLORS[environmentTag] || ENVIRONMENT_COLORS.development;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0f172a] rounded-xl shadow-2xl w-full max-w-3xl border border-slate-800 overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>{editConnection ? 'Edit Database Connection' : 'Add Database Connection'}</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] uppercase">
                  {selectedEngine}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Configure connection strings, SSH tunnels, SSL certificates &amp; environment tags</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Step 1: Engine Grid */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">1. Select Database Engine</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {DATABASE_ENGINES.map((engine) => (
                <button
                  key={engine.id}
                  type="button"
                  onClick={() => updateInput(setSelectedEngine)(engine.id)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    selectedEngine === engine.id
                      ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 font-semibold shadow-lg shadow-indigo-950/30'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-xs">{engine.name}</span>
                    {selectedEngine === engine.id && <CheckCircle2 size={12} className="text-indigo-400 shrink-0" />}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">{engine.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Connection Method Tabs */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">2. Connection Method</label>
            <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-2">
              {[
                { id: 'fields', label: 'Individual Fields' },
                { id: 'uri', label: 'Connection URI / String' },
                { id: 'ssh_tunnel', label: 'SSH Tunnel' },
                { id: 'ssl', label: 'SSL / TLS Certs' },
                { id: 'socket', label: 'Unix Socket' },
                { id: 'read_replica', label: 'Read Replica' },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => updateInput(setConnectionMethod)(method.id as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    connectionMethod === method.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Dynamic Form Inputs */}
          {connectionMethod === 'uri' ? (
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Connection String / URI</label>
              <textarea
                value={connectionString}
                onChange={(e) => updateInput(setConnectionString)(e.target.value)}
                placeholder={
                  selectedEngine === 'mongodb'
                    ? 'mongodb+srv://user:pass@cluster.mongodb.net/dbname'
                    : selectedEngine === 'redis'
                    ? 'redis://:password@host:6379'
                    : 'postgresql://username:password@localhost:5432/dbname?sslmode=require'
                }
                rows={3}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900 font-mono text-xs text-white outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <HelpCircle size={11} className="text-slate-500" />
                Copy and paste your database connection string directly from MongoDB Atlas, AWS RDS, Neon, or PlanetScale.
              </p>
            </div>
          ) : selectedEngine === 'dynamodb' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">AWS Access Key ID</label>
                <input
                  type="text"
                  value={awsAccessKeyId}
                  onChange={(e) => updateInput(setAwsAccessKeyId)(e.target.value)}
                  placeholder="AKIAXXXXXXXXXXXXXXXX"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 font-mono text-white outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Found in AWS IAM Console under Security Credentials.</p>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  AWS Secret Access Key {editConnection && <span className="text-slate-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={awsSecretKey}
                    onChange={(e) => updateInput(setAwsSecretKey)(e.target.value)}
                    placeholder={editConnection ? '•••••••••••• (saved — leave blank to keep current)' : 'Secret Access Key'}
                    className="w-full px-3 py-2 pr-10 border rounded-lg bg-slate-900 border-slate-700 font-mono text-white outline-none focus:border-indigo-500"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">AWS Region</label>
                <select
                  value={awsRegion}
                  onChange={(e) => updateInput(setAwsRegion)(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 text-white outline-none focus:border-indigo-500"
                >
                  <option value="us-east-1">us-east-1 (N. Virginia)</option>
                  <option value="us-west-2">us-west-2 (Oregon)</option>
                  <option value="eu-west-1">eu-west-1 (Ireland)</option>
                  <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                  <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Endpoint URL (Optional for Local DynamoDB)</label>
                <input
                  type="text"
                  value={endpointUrl}
                  onChange={(e) => updateInput(setEndpointUrl)(e.target.value)}
                  placeholder="http://localhost:8000"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 font-mono text-white outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Use http://localhost:8000 for local DynamoDB testing.</p>
              </div>
            </div>
          ) : selectedEngine === 'sqlite' ? (
            <div>
              <label className="block font-semibold text-slate-300 mb-1">SQLite Database File Path</label>
              <input
                type="text"
                value={database}
                onChange={(e) => updateInput(setDatabase)(e.target.value)}
                placeholder="./data/app.db or :memory:"
                className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 font-mono text-white outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Absolute or relative path to SQLite .db file.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Host / Server Address</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => updateInput(setHost)(e.target.value)}
                  placeholder="localhost or db.cluster.com"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 text-white outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">IP address or hostname of database server.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => updateInput(setPort)(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 font-mono text-white outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Default port for {selectedEngine.toUpperCase()}: {DATABASE_ENGINES.find(e=>e.id===selectedEngine)?.defaultPort}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Database Name</label>
                <input
                  type="text"
                  value={database}
                  onChange={(e) => updateInput(setDatabase)(e.target.value)}
                  placeholder="production_db"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 text-white outline-none focus:border-indigo-500"
                />
              </div>

              {selectedEngine === 'redis' ? (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Redis Database Index</label>
                  <input
                    type="number"
                    value={dbIndex}
                    onChange={(e) => updateInput(setDbIndex)(Number(e.target.value))}
                    min={0}
                    max={15}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 text-white outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Redis DB index (0 to 15).</p>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => updateInput(setUsername)(e.target.value)}
                    placeholder={selectedEngine === 'mysql' ? 'root' : 'postgres'}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {selectedEngine === 'mongodb' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Auth Database</label>
                    <input
                      type="text"
                      value={authDatabase}
                      onChange={(e) => updateInput(setAuthDatabase)(e.target.value)}
                      placeholder="admin"
                      className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 text-white outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Database holding user credentials (default: admin).</p>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Auth Mechanism</label>
                    <select
                      value={authMechanism}
                      onChange={(e) => updateInput(setAuthMechanism)(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 text-white outline-none focus:border-indigo-500"
                    >
                      <option value="DEFAULT">DEFAULT (SCRAM-SHA-256)</option>
                      <option value="SCRAM-SHA-1">SCRAM-SHA-1</option>
                      <option value="SCRAM-SHA-256">SCRAM-SHA-256</option>
                      <option value="MONGODB-CR">MONGODB-CR</option>
                      <option value="PLAIN">PLAIN</option>
                    </select>
                  </div>
                </>
              )}

              <div className="col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">
                  Password {editConnection && <span className="text-slate-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => updateInput(setPassword)(e.target.value)}
                    placeholder={editConnection ? '•••••••• (saved — leave blank to keep current)' : 'Database Password'}
                    className="w-full px-3 py-2 pr-10 border rounded-lg bg-slate-900 border-slate-700 font-mono text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Credentials are encrypted via AES-256-CBC prior to storage.</p>
              </div>
            </div>
          )}

          {/* SSH Tunnel Options */}
          {(connectionMethod === 'ssh_tunnel' || enableSsh) && (
            <div className="p-3 border border-amber-500/30 rounded-lg bg-amber-950/20 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Terminal size={14} /> SSH Bastion Host Configuration
                </span>
                <label className="flex items-center space-x-1.5 text-[11px] text-amber-200 cursor-pointer">
                  <input type="checkbox" checked={enableSsh || connectionMethod === 'ssh_tunnel'} onChange={(e) => setEnableSsh(e.target.checked)} className="rounded" />
                  <span>Enable Tunnel</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-amber-200 block mb-0.5 font-semibold">SSH Host</label>
                  <input
                    type="text"
                    placeholder="bastion.company.com"
                    value={sshHost}
                    onChange={(e) => updateInput(setSshHost)(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded bg-slate-900 border-slate-700 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-200 block mb-0.5 font-semibold">SSH Port</label>
                  <input
                    type="number"
                    placeholder="22"
                    value={sshPort}
                    onChange={(e) => updateInput(setSshPort)(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border rounded bg-slate-900 border-slate-700 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-200 block mb-0.5 font-semibold">SSH Username</label>
                  <input
                    type="text"
                    placeholder="ubuntu / ec2-user"
                    value={sshUsername}
                    onChange={(e) => updateInput(setSshUsername)(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded bg-slate-900 border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-200 block mb-0.5 font-semibold">SSH Auth Method</label>
                  <select
                    value={sshAuthMethod}
                    onChange={(e) => updateInput(setSshAuthMethod)(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border rounded bg-slate-900 border-slate-700 text-white text-xs"
                  >
                    <option value="password">Password Auth</option>
                    <option value="key">Private Key Auth (PEM)</option>
                  </select>
                </div>

                {sshAuthMethod === 'password' ? (
                  <div className="col-span-2">
                    <label className="text-[10px] text-amber-200 block mb-0.5 font-semibold">SSH Password</label>
                    <input
                      type="password"
                      placeholder={editConnection ? '•••••••• (saved — leave blank to keep current)' : 'SSH Password'}
                      value={sshPassword}
                      onChange={(e) => updateInput(setSshPassword)(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded bg-slate-900 border-slate-700 font-mono text-white text-xs"
                    />
                  </div>
                ) : (
                  <div className="col-span-2 space-y-2">
                    <div>
                      <label className="text-[10px] text-amber-200 block mb-0.5 font-semibold">SSH Private Key (PEM format)</label>
                      <textarea
                        placeholder={editConnection ? '•••••••• (saved — leave blank to keep current)' : '-----BEGIN RSA PRIVATE KEY-----\n...'}
                        value={sshPrivateKey}
                        onChange={(e) => updateInput(setSshPrivateKey)(e.target.value)}
                        rows={3}
                        className="w-full px-2.5 py-1.5 border rounded bg-slate-900 border-slate-700 font-mono text-[10px] text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-200 block mb-0.5 font-semibold">Passphrase (Optional)</label>
                      <input
                        type="password"
                        placeholder="Key Passphrase if encrypted"
                        value={sshPassphrase}
                        onChange={(e) => updateInput(setSshPassphrase)(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded bg-slate-900 border-slate-700 font-mono text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SSL / TLS Options */}
          {(connectionMethod === 'ssl' || enableSsl) && (
            <div className="p-3 border border-sky-500/30 rounded-lg bg-sky-950/20 space-y-3">
              <div className="flex items-center justify-between border-b border-sky-500/30 pb-2">
                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Shield size={14} /> SSL / TLS Certificate Settings
                </span>
                <label className="flex items-center space-x-1.5 text-[11px] text-sky-200 cursor-pointer">
                  <input type="checkbox" checked={enableSsl || connectionMethod === 'ssl'} onChange={(e) => setEnableSsl(e.target.checked)} className="rounded" />
                  <span>Enable SSL</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-sky-200 block mb-0.5 font-semibold">SSL Mode</label>
                  <select
                    value={sslMode}
                    onChange={(e) => updateInput(setSslMode)(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded bg-slate-900 border-slate-700 text-white text-xs"
                  >
                    <option value="require">Require (Standard SSL)</option>
                    <option value="verify-ca">Verify CA (Check certificate authority)</option>
                    <option value="verify-full">Verify Full (Check hostname & CA)</option>
                    <option value="allow">Allow</option>
                    <option value="disable">Disable</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center space-x-2 text-sky-200 text-xs cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={rejectUnauthorized}
                      onChange={(e) => updateInput(setRejectUnauthorized)(e.target.checked)}
                      className="rounded"
                    />
                    <span>Reject Unauthorized Certs</span>
                  </label>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] text-sky-200 block mb-0.5 font-semibold">CA Certificate (PEM)</label>
                  <textarea
                    placeholder="-----BEGIN CERTIFICATE-----\n..."
                    value={sslCaCert}
                    onChange={(e) => updateInput(setSslCaCert)(e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1.5 border rounded bg-slate-900 border-slate-700 font-mono text-[10px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-sky-200 block mb-0.5 font-semibold">Client Cert (PEM)</label>
                  <textarea
                    placeholder="-----BEGIN CERTIFICATE-----\n..."
                    value={sslClientCert}
                    onChange={(e) => updateInput(setSslClientCert)(e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1.5 border rounded bg-slate-900 border-slate-700 font-mono text-[10px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-sky-200 block mb-0.5 font-semibold">Client Key (PEM)</label>
                  <textarea
                    placeholder="-----BEGIN RSA PRIVATE KEY-----\n..."
                    value={sslClientKey}
                    onChange={(e) => updateInput(setSslClientKey)(e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1.5 border rounded bg-slate-900 border-slate-700 font-mono text-[10px] text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Environment & Labeling */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Connection Label (Required)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => updateInput(setLabel)(e.target.value)}
                placeholder="Production MongoDB Atlas"
                className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Environment Tag</label>
              <select
                value={environmentTag}
                onChange={(e) => updateInput(setEnvironmentTag)(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-slate-900 border-slate-700 text-white outline-none focus:border-indigo-500"
              >
                {Object.entries(ENVIRONMENT_COLORS).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label} {key === 'production' ? '⚠️' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Environment Color Preview Banner */}
          <div
            className="p-2.5 rounded-lg border flex items-center justify-between transition-all"
            style={{
              backgroundColor: activeEnvStyle.bg,
              color: activeEnvStyle.text,
              borderColor: activeEnvStyle.border,
            }}
          >
            <span className="font-bold flex items-center gap-1.5">
              {environmentTag === 'production' && <AlertTriangle size={14} className="text-red-400" />}
              <span>Environment: {activeEnvStyle.label.toUpperCase()}</span>
            </span>
            <span className="text-[10px] font-mono opacity-80">Visual Badge Preview</span>
          </div>

          <label className="flex items-center space-x-2 text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={readOnlyOnly}
              onChange={(e) => updateInput(setReadOnlyOnly)(e.target.checked)}
              className="rounded"
            />
            <span>Restrict connection to read-only (SELECT / query operations only)</span>
          </label>

          {/* Step 5: Test Connection Alert Box */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl flex items-start space-x-3 text-xs border ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/50 text-red-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold text-sm">
                  {testResult.success ? '✓ Connection Verified & Active' : '✕ Connection Test Failed'}
                </p>
                <p className="leading-relaxed font-mono text-[11px]">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30 flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
            <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
          </button>

          <div className="flex space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveConnection}
              disabled={isSaving || !testResult?.success}
              className={`px-5 py-2 text-xs font-semibold rounded-lg text-white transition-all flex items-center gap-1.5 ${
                testResult?.success
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-60'
              }`}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : editConnection ? 'Update Connection' : 'Save Connection'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

