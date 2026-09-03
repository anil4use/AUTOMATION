'use client';
import React from 'react';
import { Key, Plus, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface Connection {
  _id: string;
  connectorId: string;
  name: string;
  authType: string;
  status: 'connected' | 'expired' | 'error';
}

interface ConnectionSelectorProps {
  connectorId: string;
  selectedConnectionId?: string;
  connections: Connection[];
  onSelectConnection: (connectionId: string) => void;
  onAddNewAccount: () => void;
}

export function ConnectionSelector({
  connectorId,
  selectedConnectionId,
  connections,
  onSelectConnection,
  onAddNewAccount,
}: ConnectionSelectorProps) {
  const filteredConnections = connections.filter((c) => c.connectorId === connectorId || connectorId.includes(c.connectorId));

  return (
    <div className="space-y-2 text-xs">
      <label className="block font-semibold text-gray-300 uppercase tracking-wider text-[10px]">
        Account Connection
      </label>

      {filteredConnections.length === 0 ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertCircle size={15} />
            <span>No connected accounts for <strong className="text-white">{connectorId}</strong></span>
          </div>
          <button
            onClick={onAddNewAccount}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg transition-all"
          >
            <Plus size={13} /> Connect Account
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selectedConnectionId || ''}
            onChange={(e) => onSelectConnection(e.target.value)}
            className="flex-1 bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/60 transition-all"
          >
            <option value="">-- Select Connected Account --</option>
            {filteredConnections.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.status === 'connected' ? 'Connected' : 'Needs Reconnect'})
              </option>
            ))}
          </select>
          <button
            onClick={onAddNewAccount}
            className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-all flex-shrink-0"
          >
            <Plus size={14} /> Add New
          </button>
        </div>
      )}

      {selectedConnectionId && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
          <CheckCircle2 size={12} />
          <span>Account verified and ready to execute</span>
        </div>
      )}
    </div>
  );
}
