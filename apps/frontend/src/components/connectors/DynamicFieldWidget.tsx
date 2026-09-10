'use client';
import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, ChevronDown, Code, Key } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface DynamicFieldWidgetProps {
  propKey: string;
  propMeta: any;
  uiMeta?: any;
  isRequired?: boolean;
  value: any;
  onChange: (val: any) => void;
  connectorId: string;
  actionId: string;
}

export const DynamicFieldWidget: React.FC<DynamicFieldWidgetProps> = ({
  propKey,
  propMeta,
  uiMeta,
  isRequired = false,
  value,
  onChange,
  connectorId,
  actionId,
}) => {
  const widget = uiMeta?.widget || (propMeta?.enum ? 'select' : 'text');
  const placeholder = uiMeta?.placeholder || propMeta?.description || `Enter ${propMeta?.title || propKey}...`;

  // Dynamic options state (for dynamic_select)
  const [dynamicOptions, setDynamicOptions] = useState<{ label: string; value: any }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Key-Value pairs state (for key_value)
  const [kvPairs, setKvPairs] = useState<{ id: string; key: string; val: string }[]>(() => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return Object.entries(value).map(([k, v], idx) => ({ id: `${idx}`, key: k, val: String(v) }));
    }
    return [{ id: '1', key: '', val: '' }];
  });

  useEffect(() => {
    if (widget === 'dynamic_select' && uiMeta?.optionsEndpoint) {
      fetchDynamicOptions();
    }
  }, [widget, uiMeta?.optionsEndpoint]);

  const fetchDynamicOptions = async () => {
    try {
      setLoadingOptions(true);
      const res = await apiClient.get(uiMeta.optionsEndpoint);
      if (res.data?.options && Array.isArray(res.data.options)) {
        setDynamicOptions(res.data.options);
      }
    } catch (err) {
      console.warn('Failed to fetch dynamic field options:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleKvChange = (id: string, field: 'key' | 'val', newText: string) => {
    const updated = kvPairs.map((pair) => (pair.id === id ? { ...pair, [field]: newText } : pair));
    setKvPairs(updated);

    const obj: Record<string, string> = {};
    updated.forEach((p) => {
      if (p.key.trim()) obj[p.key.trim()] = p.val;
    });
    onChange(obj);
  };

  const addKvPair = () => {
    const next = [...kvPairs, { id: `${Date.now()}`, key: '', val: '' }];
    setKvPairs(next);
  };

  const removeKvPair = (id: string) => {
    const next = kvPairs.filter((p) => p.id !== id);
    setKvPairs(next);
    const obj: Record<string, string> = {};
    next.forEach((p) => {
      if (p.key.trim()) obj[p.key.trim()] = p.val;
    });
    onChange(obj);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold text-white flex items-center gap-1.5">
          <span>{propMeta?.title || propKey}</span>
          <code className="text-[11px] text-emerald-400 font-mono font-normal">({propKey})</code>
        </label>
        {isRequired ? (
          <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            REQUIRED
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">OPTIONAL</span>
        )}
      </div>

      {propMeta?.description && (
        <p className="text-[11px] text-slate-400 leading-tight">{propMeta.description}</p>
      )}

      {/* WIDGET 1: Select Dropdown */}
      {widget === 'select' && (
        <div className="relative">
          <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-emerald-500 outline-none appearance-none cursor-pointer pr-10"
          >
            <option value="">-- Select {propMeta?.title || propKey} --</option>
            {(uiMeta?.enum || propMeta?.enum || []).map((opt: any) => {
              const val = typeof opt === 'object' ? opt.value : opt;
              const label = typeof opt === 'object' ? opt.label : opt;
              return (
                <option key={String(val)} value={val} className="bg-slate-900 text-white">
                  {label}
                </option>
              );
            })}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
        </div>
      )}

      {/* WIDGET 2: Dynamic Async Select Dropdown */}
      {widget === 'dynamic_select' && (
        <div className="relative">
          {loadingOptions ? (
            <div className="p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Fetching live options from API...</span>
            </div>
          ) : (
            <div className="relative">
              <select
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-emerald-500 outline-none appearance-none cursor-pointer pr-10"
              >
                <option value="">-- Select {propMeta?.title || propKey} --</option>
                {dynamicOptions.map((opt) => (
                  <option key={String(opt.value)} value={opt.value} className="bg-slate-900 text-white">
                    {opt.label} ({String(opt.value)})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {/* WIDGET 3: Textarea Multi-line */}
      {widget === 'textarea' && (
        <textarea
          rows={3}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none transition-all font-sans leading-relaxed"
        />
      )}

      {/* WIDGET 4: Code Editor (SQL, JSON Queries) */}
      {widget === 'code_editor' && (
        <div className="relative rounded-xl border border-white/10 bg-slate-950 overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-900 border-b border-white/[0.06] text-[10px] font-mono text-emerald-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Code className="w-3 h-3" />
              <span>QUERY EDITOR / CODE PAYLOAD</span>
            </span>
          </div>
          <textarea
            rows={4}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 bg-slate-950 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none transition-all leading-relaxed"
          />
        </div>
      )}

      {/* WIDGET 5: Key-Value Pair Builder */}
      {widget === 'key_value' && (
        <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-white/10">
          {kvPairs.map((pair) => (
            <div key={pair.id} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Key (e.g. param1)"
                value={pair.key}
                onChange={(e) => handleKvChange(pair.id, 'key', e.target.value)}
                className="w-1/2 p-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
              />
              <input
                type="text"
                placeholder="Value"
                value={pair.val}
                onChange={(e) => handleKvChange(pair.id, 'val', e.target.value)}
                className="w-1/2 p-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={() => removeKvPair(pair.id)}
                className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
                title="Remove pair"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addKvPair}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 text-[11px] font-semibold rounded-lg border border-white/10 flex items-center gap-1 transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>Add Key-Value Pair</span>
          </button>
        </div>
      )}

      {/* WIDGET 6: Boolean Switch */}
      {widget === 'boolean' && (
        <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => onChange(!value)}
            className={`w-12 h-6 rounded-full p-1 transition-colors relative flex items-center ${
              value ? 'bg-emerald-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                value ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs font-semibold text-white">
            {value ? 'ENABLED (TRUE)' : 'DISABLED (FALSE)'}
          </span>
        </div>
      )}

      {/* WIDGET 7: Number Input */}
      {widget === 'number' && (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder={placeholder}
          className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none transition-all font-mono"
        />
      )}

      {/* WIDGET 8: Default Fallback Text Input */}
      {widget === 'text' && (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none transition-all font-sans"
        />
      )}
    </div>
  );
};
