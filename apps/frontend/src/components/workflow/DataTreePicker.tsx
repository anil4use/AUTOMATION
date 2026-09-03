'use client';
import React, { useState } from 'react';
import { Database, ChevronRight, ChevronDown, Sparkles, Tag, Search, ArrowRight } from 'lucide-react';

interface DataField {
  key: string;
  label: string;
  path: string; // e.g. "trigger.email" or "step_1.output.id"
  sampleValue?: any;
  type?: string;
}

interface StepOutputSource {
  stepId: string;
  stepName: string;
  connectorId: string;
  fields: DataField[];
}

interface DataTreePickerProps {
  sources: StepOutputSource[];
  onSelectVariable: (variableExpression: string) => void;
  onClose?: () => void;
}

export function DataTreePicker({ sources, onSelectVariable, onClose }: DataTreePickerProps) {
  const [search, setSearch] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sources.forEach((s, idx) => { initial[s.stepId] = idx === 0; });
    return initial;
  });

  const toggleExpand = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const filteredSources = sources.map((source) => ({
    ...source,
    fields: source.fields.filter(
      (f) =>
        f.label.toLowerCase().includes(search.toLowerCase()) ||
        f.path.toLowerCase().includes(search.toLowerCase()) ||
        String(f.sampleValue || '').toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((s) => s.fields.length > 0 || search === '');

  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[380px] w-full text-xs">
      {/* Search Header */}
      <div className="p-2.5 border-b border-white/8 bg-[#0b0f19] flex items-center gap-2">
        <Search size={14} className="text-gray-500 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search step data outputs (e.g. email, name, id)..."
          className="w-full bg-transparent text-white placeholder-gray-500 text-xs focus:outline-none"
        />
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs px-1.5 py-0.5 rounded bg-white/5">
            Esc
          </button>
        )}
      </div>

      {/* Output Step Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredSources.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No matching data fields found.
          </div>
        ) : (
          filteredSources.map((source) => {
            const isExpanded = expandedSteps[source.stepId];
            return (
              <div key={source.stepId} className="border border-white/6 rounded-lg overflow-hidden bg-black/20">
                {/* Step Header Accordion */}
                <button
                  onClick={() => toggleExpand(source.stepId)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-white/3 hover:bg-white/6 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <Database size={13} className="text-indigo-400" />
                    <span>{source.stepName}</span>
                    <span className="text-[10px] text-gray-500 font-mono">({source.connectorId})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded-full">
                      {source.fields.length} fields
                    </span>
                    {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  </div>
                </button>

                {/* Field Pills */}
                {isExpanded && (
                  <div className="p-2 space-y-1 bg-[#0b0f19]/60 border-t border-white/5">
                    {source.fields.map((field) => {
                      const expr = `{{${field.path}}}`;
                      return (
                        <button
                          key={field.path}
                          onClick={() => onSelectVariable(expr)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-indigo-500/15 border border-transparent hover:border-indigo-500/30 transition-all text-left group"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Tag size={11} className="text-gray-500 group-hover:text-indigo-400 flex-shrink-0" />
                            <span className="font-semibold text-gray-200 group-hover:text-white truncate">{field.label}</span>
                            <span className="text-[10px] font-mono text-gray-500 group-hover:text-indigo-300 truncate">
                              {field.path}
                            </span>
                          </div>
                          {field.sampleValue !== undefined && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono truncate max-w-[120px]">
                                {String(field.sampleValue)}
                              </span>
                              <ArrowRight size={12} className="text-gray-600 group-hover:text-indigo-400" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 bg-[#0b0f19] border-t border-white/8 text-[10px] text-gray-500 flex items-center gap-1.5 justify-center">
        <Sparkles size={11} className="text-indigo-400" />
        Click any field pill above to map its token into your input field
      </div>
    </div>
  );
}
