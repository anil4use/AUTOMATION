'use client';
import React, { useState } from 'react';
import { Key, Plus, CheckCircle2, AlertCircle, RefreshCw, AlertTriangle, Database } from 'lucide-react';
import { ENVIRONMENT_COLORS } from '@/components/connectors/DatabaseConnectModal';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export interface Connection {
  _id: string;
  connectorId: string;
  name: string;
  label?: string;
  authType: string;
  status: 'connected' | 'expired' | 'error';
  environmentTag?: string;
  dbType?: string;
  lastTestedAt?: string;
  lastTestError?: string;
}

interface ConnectionSelectorProps {
  connectorId: string;
  selectedConnectionId?: string;
  connections: Connection[];
  onSelectConnection: (connectionId: string) => void;
  onAddNewAccount: () => void;
  onRefreshConnections?: () => void;
}

export function ConnectionSelector({
  connectorId,
  selectedConnectionId,
  connections,
  onSelectConnection,
  onAddNewAccount,
  onRefreshConnections,
}: ConnectionSelectorProps) {
  const [retestingId, setRetestingId] = useState<string | null>(null);

  const filteredConnections = connections.filter(
    (c) => c.connectorId === connectorId || (c.dbType && connectorId.includes(c.dbType)) || connectorId.includes(c.connectorId)
  );

  const selectedConn = filteredConnections.find((c) => c._id === selectedConnectionId || (c as any).id === selectedConnectionId);
  const selectedEnvKey = (selectedConn?.environmentTag || 'development').toLowerCase();
  const envStyle = ENVIRONMENT_COLORS[selectedEnvKey] || ENVIRONMENT_COLORS.development;

  const isDegraded = selectedConn && (selectedConn.status === 'expired' || selectedConn.status === 'error');

  const handleRetest = async (connId: string) => {
    setRetestingId(connId);
    try {
      const res = await apiClient.post(`/v1/connectors/connections/${connId}/test`, {});
      const data = res.data;
      if (data.success && (data.data?.success || data.data?.status === 'success')) {
        toast.success('Connection Verified Live!', { description: `Latency: ${data.data?.pingMs ?? 24}ms` });
        if (onRefreshConnections) onRefreshConnections();
      } else {
        toast.error('Connection Verification Failed', { description: data.message || data.data?.error });
      }
    } catch (err: any) {
      toast.error('Connection Test Error', { description: err?.response?.data?.message || err?.message });
    } finally {
      setRetestingId(null);
    }
  };

  return (
    <div className="space-y-2.5 text-xs">
      <label className="block font-semibold text-gray-300 uppercase tracking-wider text-[10px]">
        Account Connection / Database Driver
      </label>

      {filteredConnections.length === 0 ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertCircle size={15} />
            <span>No connected accounts for <strong className="text-white">{connectorId}</strong></span>
          </div>
          <button
            onClick={onAddNewAccount}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg transition-all shadow-md"
          >
            <Plus size={13} /> Connect Account
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selectedConnectionId || ''}
            onChange={(e) => onSelectConnection(e.target.value)}
            className="flex-1 bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/60 transition-all font-sans text-xs"
          >
            <option value="">-- Select Connected Account / Database --</option>
            {filteredConnections.map((c) => {
              const envLabel = c.environmentTag ? `[${c.environmentTag.toUpperCase()}] ` : '';
              const statusLabel = c.status === 'connected' ? 'Active 🟢' : 'Needs Reconnect 🔴';
              return (
                <option key={c._id} value={c._id}>
                  {envLabel}{c.label || c.name} ({statusLabel})
                </option>
              );
            })}
          </select>
          <button
            onClick={onAddNewAccount}
            className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-all flex-shrink-0 font-semibold text-xs"
            title="Configure new connection"
          >
            <Plus size={14} /> Add New
          </button>
        </div>
      )}

      {selectedConn && (
        <div className="space-y-2">
          {/* Active Connection Detail Pill */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/10 text-[11px]">
            <div className="flex items-center gap-2">
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 flex items-center gap-0.5"
                style={{
                  backgroundColor: envStyle.bg,
                  color: envStyle.text,
                  border: `1px solid ${envStyle.border}`,
                }}
              >
                {selectedEnvKey === 'production' && <span>⚠️</span>}
                <span>{envStyle.label}</span>
              </span>
              <span className="font-bold text-white truncate">{selectedConn.label || selectedConn.name}</span>
            </div>

            {selectedConn.status === 'connected' ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[10px]">
                <CheckCircle2 size={12} />
                <span>Verified 🟢</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-400 font-semibold text-[10px]">
                <AlertCircle size={12} />
                <span>Expired / Error 🔴</span>
              </span>
            )}
          </div>

          {/* Warning Banner if Connection is Expired or Failed */}
          {isDegraded && (
            <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-xl flex items-center justify-between gap-2 text-red-200">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-red-300 text-xs">Connection Expired or Failed</div>
                  <div className="text-[10px] text-red-300/80 truncate">
                    {selectedConn.lastTestError || 'Credentials failed verification ping. Please re-test or reconnect.'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRetest(selectedConn._id)}
                disabled={Boolean(retestingId)}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
              >
                <RefreshCw size={12} className={retestingId ? 'animate-spin' : ''} />
                <span>{retestingId ? 'Testing...' : 'Re-test / Reconnect'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

