'use client';
import React, { useEffect, useState } from 'react';
import { X, Search, Database, Sparkles, Filter, RefreshCw, Zap, Tag, ShieldCheck, CheckCircle2, Layers } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface FieldCatalogInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FieldCatalogInspectorModal({ isOpen, onClose }: FieldCatalogInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'coercions' | 'synonyms'>('catalog');
  const [catalog, setCatalog] = useState<any[]>([]);
  const [coercions, setCoercions] = useState<any[]>([]);
  const [synonyms, setSynonyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchIntelligenceData = async () => {
    try {
      setLoading(true);
      const [catRes, coerRes, synRes] = await Promise.all([
        apiClient.get('/v1/connectors/intelligence/field-catalog').catch(() => ({ data: { data: [] } })),
        apiClient.get('/v1/connectors/intelligence/coercion-rules').catch(() => ({ data: { data: [] } })),
        apiClient.get('/v1/connectors/intelligence/synonym-groups').catch(() => ({ data: { data: [] } })),
      ]);

      setCatalog(catRes.data?.data || []);
      setCoercions(coerRes.data?.data || []);
      setSynonyms(synRes.data?.data || []);
    } catch (err: any) {
      toast.error('Failed to load field catalog intelligence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIntelligenceData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCatalog = catalog.filter(
    (item) =>
      item.connectorId?.toLowerCase().includes(search.toLowerCase()) ||
      item.fieldKey?.toLowerCase().includes(search.toLowerCase()) ||
      item.semanticRole?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCoercions = coercions.filter(
    (item) =>
      item.ruleId?.toLowerCase().includes(search.toLowerCase()) ||
      item.fromType?.toLowerCase().includes(search.toLowerCase()) ||
      item.toType?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSynonyms = synonyms.filter(
    (item) =>
      item.canonicalName?.toLowerCase().includes(search.toLowerCase()) ||
      item.semanticRole?.toLowerCase().includes(search.toLowerCase()) ||
      (item.synonyms || []).some((s: string) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="w-full max-w-4xl bg-[#0d1117] border border-indigo-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] text-xs">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#111827] via-[#0d1117] to-[#111827] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles size={20} className="text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>AI Data Bridge Field Catalog &amp; Intelligence Rules</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                  ZERO-CODE DATABASE ENGINE
                </span>
              </h3>
              <p className="text-gray-400 text-[11px] font-mono mt-0.5">
                Inspect seeded field schemas, semantic roles, coercion transformations, and synonym groups across all 70+ connectors.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Subnav & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-3 bg-[#0b0f19] border-b border-white/8">
          <div className="flex items-center gap-2">
            {[
              { id: 'catalog', label: `Field Catalog (${catalog.length})`, icon: Database },
              { id: 'coercions', label: `Coercion Rules (${coercions.length})`, icon: Zap },
              { id: 'synonyms', label: `Synonym Groups (${synonyms.length})`, icon: Tag },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search connectors, keys, roles..."
              className="bg-[#111827] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono text-xs w-64"
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto max-h-[60vh] flex flex-col gap-3 font-mono">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2 font-sans">
              <RefreshCw size={18} className="animate-spin text-indigo-400" />
              <span>Fetching intelligence catalog from MongoDB...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: Field Catalog */}
              {activeTab === 'catalog' && (
                <div className="space-y-3">
                  {filteredCatalog.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 font-sans border border-white/6 rounded-xl bg-white/2">
                      No field catalog entries match filter. Run <code className="text-indigo-300">npm run seed:all</code> to seed catalog records.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-white/10 rounded-xl bg-black/40">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-gray-400 border-b border-white/10 text-[10px] uppercase font-mono">
                          <tr>
                            <th className="p-3">Connector</th>
                            <th className="p-3">Field Key &amp; Label</th>
                            <th className="p-3">Data Type</th>
                            <th className="p-3">Semantic Role</th>
                            <th className="p-3">Unit Tag</th>
                            <th className="p-3">Sample Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredCatalog.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/3 transition-colors">
                              <td className="p-3 text-indigo-300 font-bold">{item.connectorId}</td>
                              <td className="p-3">
                                <div className="flex flex-col">
                                  <span className="text-white font-semibold">{item.fieldKey}</span>
                                  <span className="text-[10px] text-gray-500 font-sans">{item.label}</span>
                                </div>
                              </td>
                              <td className="p-3 text-gray-300">{item.dataType}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px]">
                                  {item.semanticRole || 'generic'}
                                </span>
                              </td>
                              <td className="p-3 text-amber-300 font-mono text-[10px]">
                                {item.unitTag || '—'}
                              </td>
                              <td className="p-3 text-gray-400 font-mono text-[10px]">
                                {item.sampleValue !== undefined ? String(item.sampleValue) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Universal Coercion Rules */}
              {activeTab === 'coercions' && (
                <div className="space-y-3">
                  {filteredCoercions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 font-sans border border-white/6 rounded-xl bg-white/2">
                      No coercion rules found. Run <code className="text-indigo-300">npm run seed:coercion-rules</code> to seed rules.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredCoercions.map((rule, idx) => (
                        <div key={idx} className="p-4 bg-white/3 border border-white/8 rounded-xl flex flex-col gap-2">
                          <div className="flex items-center justify-between border-b border-white/6 pb-2">
                            <span className="font-bold text-amber-300 flex items-center gap-1.5">
                              <Zap size={14} className="text-amber-400" />
                              {rule.ruleId}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                              Priority: {rule.priority || 100}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-300 font-mono mt-1">
                            <span className="px-2 py-0.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded">
                              {rule.fromType || rule.sourceFormat}
                            </span>
                            <span>→</span>
                            <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded">
                              {rule.toType || rule.targetFormat}
                            </span>
                          </div>

                          {rule.description && (
                            <p className="text-[11px] font-sans text-gray-400 mt-1 leading-relaxed">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Synonym Groups */}
              {activeTab === 'synonyms' && (
                <div className="space-y-3">
                  {filteredSynonyms.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 font-sans border border-white/6 rounded-xl bg-white/2">
                      No synonym groups found. Run <code className="text-indigo-300">npm run seed:synonym-groups</code> to seed groups.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredSynonyms.map((group, idx) => (
                        <div key={idx} className="p-4 bg-white/3 border border-white/8 rounded-xl flex flex-col gap-2.5">
                          <div className="flex items-center justify-between border-b border-white/6 pb-2">
                            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                              <Tag size={14} className="text-indigo-400" />
                              Canonical: <code className="text-white">{group.canonicalName}</code>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                              {group.semanticRole || 'generic'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {(group.synonyms || []).map((syn: string, sIdx: number) => (
                              <span key={sIdx} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 text-[11px] font-mono">
                                {syn}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#111827] border-t border-white/10 flex items-center justify-between text-gray-400 font-sans">
          <span className="text-[11px]">
            ⚡ Powered by MongoDB Atlas Knowledge Collections
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
