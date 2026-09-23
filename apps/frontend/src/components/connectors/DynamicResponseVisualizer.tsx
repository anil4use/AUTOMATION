'use client';
import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Eye, Code, Layers, Terminal, ExternalLink, Braces } from 'lucide-react';
import { toast } from 'sonner';

interface DynamicResponseVisualizerProps {
  data: any;
  actionId?: string;
  connectorId?: string;
}

export const DynamicResponseVisualizer: React.FC<DynamicResponseVisualizerProps> = ({
  data,
  actionId = '',
  connectorId = '',
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'tree' | 'raw'>('visual');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({ root: true });

  const copyValue = (value: any, keyName: string) => {
    const valStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    navigator.clipboard.writeText(valStr);
    setCopiedKey(keyName);
    toast.success(`Copied '${keyName}' value`, { description: valStr });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyTag = (keyPath: string) => {
    const tag = `{{step_1.output.${keyPath}}}`;
    navigator.clipboard.writeText(tag);
    setCopiedTag(keyPath);
    toast.success('Copied Dynamic Tag', { description: tag });
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const copyRawJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Copied Response Payload JSON');
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (data === null || data === undefined) {
    return (
      <div className="p-4 rounded-xl bg-slate-900 border border-white/[0.06] text-slate-400 text-xs italic text-center">
        No response payload returned.
      </div>
    );
  }

  // Detect array payload keys (e.g. emails, messages, records, rows, items, results)
  let arrayKey: string | null = null;
  let arrayItems: any[] = [];

  if (typeof data === 'object' && !Array.isArray(data)) {
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v) && v.length > 0) {
        arrayKey = k;
        arrayItems = v;
        break;
      }
    }
  } else if (Array.isArray(data)) {
    arrayItems = data;
  }

  return (
    <div className="rounded-2xl bg-slate-950 border border-white/10 overflow-hidden shadow-2xl space-y-0">
      {/* Header Bar & View Switcher Tabs */}
      <div className="p-3.5 bg-slate-900/90 border-b border-white/[0.08] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">Response Payload</span>
          {arrayItems.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold">
              {arrayItems.length} {arrayKey ? arrayKey.toUpperCase() : 'ITEMS'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'visual'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visual Cards</span>
          </button>

          <button
            onClick={() => setActiveTab('tree')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'tree'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tree Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'raw'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Raw JSON</span>
          </button>
        </div>
      </div>

      {/* BODY VIEW 1: VISUAL CARDS / TABLES */}
      {activeTab === 'visual' && (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Top Level Summary Cards */}
          {typeof data === 'object' && !Array.isArray(data) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.entries(data).map(([k, v]) => {
                if (Array.isArray(v)) return null; // Array items handled separately below
                const valueStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
                const isUrl = typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'));

                return (
                  <div key={k} className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.06] flex items-center justify-between gap-2 group hover:border-emerald-500/30 transition-all">
                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{k}</div>
                      <div
                        className="text-xs font-bold text-emerald-400 truncate mt-0.5 cursor-pointer hover:underline"
                        title={valueStr}
                        onClick={() => copyValue(v, k)}
                      >
                        {valueStr}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Open Link Button (if URL) */}
                      {isUrl && (
                        <a
                          href={String(v)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-800 hover:bg-teal-600 text-teal-400 hover:text-white rounded-lg text-[10px] transition-all"
                          title={`Open ${k} link in new tab`}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {/* Copy Actual Value Button */}
                      <button
                        onClick={() => copyValue(v, k)}
                        className="p-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg text-[10px] transition-all"
                        title={`Copy value of ${k}`}
                      >
                        {copiedKey === k ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>

                      {/* Copy Variable Tag Button */}
                      <button
                        onClick={() => copyTag(k)}
                        className="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg text-[10px] transition-all font-mono"
                        title={`Copy tag: {{step_1.output.${k}}}`}
                      >
                        {copiedTag === k ? <Check className="w-3 h-3 text-emerald-400" /> : <Braces className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Array Items Card List */}
          {arrayItems.length > 0 ? (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center justify-between">
                <span>Returned Array Items ({arrayItems.length})</span>
                <span className="text-[10px] text-slate-400 font-mono">Click value to copy text | Click Tag button to copy variable</span>
              </div>

              {arrayItems.map((item: any, idx: number) => {
                const itemPath = arrayKey ? `${arrayKey}[${idx}]` : `items[${idx}]`;
                const subject = item.subject || item.title || item.name || item.summary || item.id || `Item #${idx + 1}`;
                const from = item.from || item.sender || item.author || item.user || item.owner;
                const date = item.date || item.createdAt || item.updatedAt;
                const snippet = item.snippet || item.description || item.body || item.text || item.content;

                return (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-emerald-500/40 transition-all space-y-3 group shadow-md">
                    {/* Item Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                            {subject}
                          </div>
                          {from && <div className="text-[11px] text-slate-400 font-medium mt-0.5">{from}</div>}
                        </div>
                      </div>

                      {date && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 shrink-0">
                          {String(date)}
                        </span>
                      )}
                    </div>

                    {/* Snippet / Content Preview */}
                    {snippet && (
                      <p className="text-xs text-slate-300/80 leading-relaxed font-normal bg-slate-950/60 p-3 rounded-xl border border-white/[0.04] line-clamp-2">
                        {snippet}
                      </p>
                    )}

                    {/* Property Toolbar: Copy Value / Copy Tag */}
                    {typeof item === 'object' && (
                      <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Copy Field:</span>
                        {Object.entries(item).map(([propKey, propVal]) => {
                          const tagKey = `${itemPath}.${propKey}`;
                          const isUrl = typeof propVal === 'string' && (propVal.startsWith('http://') || propVal.startsWith('https://'));

                          return (
                            <div key={propKey} className="inline-flex items-center rounded-lg bg-slate-950 border border-white/10 overflow-hidden">
                              <button
                                onClick={() => copyValue(propVal, propKey)}
                                className="px-2 py-1 text-[10px] font-mono text-emerald-400 hover:text-white hover:bg-emerald-600/30 transition-all flex items-center gap-1 border-r border-white/10"
                                title={`Copy value: ${String(propVal)}`}
                              >
                                <span>{propKey}</span>
                                {copiedKey === propKey ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                              </button>
                              {isUrl && (
                                <a
                                  href={String(propVal)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-1.5 py-1 text-[10px] text-teal-400 hover:bg-teal-600/30 border-r border-white/10 transition-all"
                                  title={`Open ${propKey} URL`}
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                              <button
                                onClick={() => copyTag(tagKey)}
                                className="px-1.5 py-1 text-[10px] font-mono text-slate-400 hover:text-white hover:bg-indigo-600/40 transition-all"
                                title={`Copy tag: {{step_1.output.${tagKey}}}`}
                              >
                                {copiedTag === tagKey ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Braces className="w-2.5 h-2.5" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : typeof data !== 'object' ? (
            <div className="p-4 bg-slate-900 rounded-xl text-emerald-400 font-mono text-xs break-all flex items-center justify-between gap-2">
              <span>{String(data)}</span>
              <button
                onClick={() => copyValue(data, 'response')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg text-[10px] transition-all"
              >
                {copiedKey === 'response' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* BODY VIEW 2: TREE INSPECTOR */}
      {activeTab === 'tree' && (
        <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-2">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleExpand(k)}
                  className="flex items-center gap-1.5 text-slate-200 hover:text-white font-bold"
                >
                  {typeof v === 'object' && v !== null ? (
                    expandedKeys[k] ? <ChevronDown className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  ) : null}
                  <span className="text-purple-300">{k}:</span>
                  <span className="text-[11px] text-slate-500 font-normal uppercase">
                    ({Array.isArray(v) ? `array[${v.length}]` : typeof v})
                  </span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyValue(v, k)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded text-[10px] font-mono transition-all flex items-center gap-1"
                    title={`Copy actual value of ${k}`}
                  >
                    {copiedKey === k ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy Value</span>
                  </button>
                  <button
                    onClick={() => copyTag(k)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded text-[10px] font-mono transition-all flex items-center gap-1"
                    title={`Copy variable tag {{step_1.output.${k}}}`}
                  >
                    {copiedTag === k ? <Check className="w-3 h-3 text-emerald-400" /> : <Braces className="w-3 h-3" />}
                    <span>{`{{${k}}}`}</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Content */}
              {(expandedKeys[k] ?? true) && (
                <div className="pl-4 pt-1">
                  {typeof v === 'object' && v !== null ? (
                    <pre className="p-3 bg-slate-950 rounded-xl text-emerald-400 text-[11px] leading-relaxed overflow-x-auto border border-white/[0.04]">
                      {JSON.stringify(v, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-emerald-400 font-semibold">{String(v)}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* BODY VIEW 3: RAW JSON */}
      {activeTab === 'raw' && (
        <div className="relative p-4 max-h-96 overflow-y-auto">
          <button
            onClick={copyRawJson}
            className="absolute top-6 right-6 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-all shadow-md z-10"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Copy Full JSON</span>
          </button>
          <pre className="p-4 bg-slate-900 rounded-xl text-emerald-400 font-mono text-xs leading-relaxed overflow-x-auto border border-white/[0.06]">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
