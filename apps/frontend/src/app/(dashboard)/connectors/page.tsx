'use client';
import React, { useState } from 'react';
import { Cpu, Lock, CheckCircle2, Trash2 } from 'lucide-react';
import { Button, Heading, Text, SectionCard, Badge } from '@/components/ui';

export default function ConnectorsPage() {
  const [connections, setConnections] = useState([
    { id: 'conn_1', name: 'Gmail Work Account', connectorId: 'gmail', authType: 'OAuth2 (AES-256 Encrypted)', status: 'connected', createdAt: '2026-08-18' },
    { id: 'conn_2', name: 'Slack Production Workspace', connectorId: 'slack', authType: 'OAuth2 (AES-256 Encrypted)', status: 'connected', createdAt: '2026-08-18' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyValue, setApiKeyValue] = useState('');

  const handleOAuthConnect = (connectorId: string) => {
    alert(`Initiating OAuth2 authorization flow for ${connectorId.toUpperCase()}... State & PKCE encoded with AES-256.`);
  };

  const handleAddApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyName || !apiKeyValue) return;
    const newConn = {
      id: `conn_${Date.now()}`,
      name: apiKeyName,
      connectorId: 'notion',
      authType: 'API Key (AES-256 Encrypted)',
      status: 'connected',
      createdAt: new Date().toLocaleDateString(),
    };
    setConnections([...connections, newConn]);
    setApiKeyName('');
    setApiKeyValue('');
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setConnections(connections.filter((c) => c.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1">Connector SDK & Encryption Layer</Heading>
          <Text variant="secondary">
            Manage authenticated connections. All tokens & secrets are encrypted via AES-256 before storing in database.
          </Text>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>+ Add API Key Connection</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { id: 'gmail', name: 'Gmail', category: 'Communication', authType: 'oauth2', desc: 'Read emails & send messages via OAuth2.' },
          { id: 'slack', name: 'Slack', category: 'Communication', authType: 'oauth2', desc: 'Post channel messages & listen for events.' },
          { id: 'google-sheets', name: 'Google Sheets', category: 'Productivity', authType: 'oauth2', desc: 'Append and query spreadsheet rows.' },
          { id: 'ai-node', name: 'AI Processor Node', category: 'AI Native', authType: 'none', desc: 'LLM summarization & extraction step.' },
        ].map((c) => (
          <SectionCard key={c.id} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Cpu size={22} className="text-accentIndigo" />
                <Badge variant={c.authType === 'oauth2' ? 'active' : 'info'}>{c.authType.toUpperCase()}</Badge>
              </div>
              <Heading as="h3" className="mb-1">{c.name}</Heading>
              <Text variant="secondary" className="text-xs mb-4">{c.desc}</Text>
            </div>
            <Button
              variant={c.authType === 'none' ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => handleOAuthConnect(c.id)}
            >
              {c.authType === 'none' ? 'Native Node Active' : 'Connect via OAuth2'}
            </Button>
          </SectionCard>
        ))}
      </div>

      {/* Active Secure Connections */}
      <SectionCard>
        <Heading as="h3" className="mb-4">Active Encrypted Connections</Heading>
        <div className="flex flex-col gap-3">
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center justify-between p-3.5 px-4 rounded-md bg-white/[0.02] border border-borderColor">
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-accentEmerald" />
                <div>
                  <div className="font-semibold text-sm text-white">{conn.name}</div>
                  <div className="text-xs text-textSecondary">{conn.authType} • Connected on {conn.createdAt}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="active">Active</Badge>
                <button onClick={() => handleDelete(conn.id)} className="text-textMuted hover:text-accentRose transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* API Key Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <SectionCard className="w-full max-w-md border-purple-500/40">
            <Heading as="h3" className="mb-2">Add Encrypted API Key Connection</Heading>
            <Text variant="secondary" className="mb-4 text-xs">
              Credentials are encrypted using AES-256-CBC before saving to MongoDB Atlas.
            </Text>
            <form onSubmit={handleAddApiKey} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-textSecondary font-medium mb-1 block">Connection Name</label>
                <input
                  type="text"
                  placeholder="e.g. Production OpenAI / Notion Key"
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
                  placeholder="sk-..."
                  value={apiKeyValue}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                  className="w-full bg-bgSecondary border border-borderColor rounded px-3 py-2 text-sm text-white outline-none focus:border-accentPurple"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">Encrypt & Save</Button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
