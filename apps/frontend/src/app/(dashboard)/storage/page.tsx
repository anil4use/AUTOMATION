'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Heading, Text, SectionCard, Badge } from '@/components/ui';
import {
  FolderDown, Search, Download, Eye, Trash2, RefreshCw, FileText,
  FileSpreadsheet, FileCode, HardDrive, Filter, X, Copy, Check, Clock, Database, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export interface StorageFile {
  _id: string;
  organizationId: string;
  workflowId?: string;
  executionId?: string;
  fileName: string;
  mimeType: string;
  format: 'json' | 'csv' | 'txt' | 'html' | 'pdf' | 'md' | 'xlsx' | 'raw';
  operation: 'save_document' | 'append_csv_dataset' | 'create_version_snapshot';
  sizeBytes: number;
  rowCount?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  fileContent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  formatCounts: Record<string, number>;
}

export default function DataVaultPage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [stats, setStats] = useState<StorageStats>({ totalFiles: 0, totalSizeBytes: 0, formatCounts: {} });
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<string>('all');

  // Preview Drawer State
  const [selectedFile, setSelectedFile] = useState<StorageFile | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = { limit: 100 };
      if (search) params.search = search;
      if (formatFilter !== 'all') params.format = formatFilter;

      const res = await apiClient.get('/v1/storage/files', { params });
      if (res.data?.data) {
        setFiles(res.data.data.files || []);
        setStats(res.data.data.stats || { totalFiles: 0, totalSizeBytes: 0, formatCounts: {} });
      }
    } catch (err: any) {
      toast.error('Failed to load Data Vault files', {
        description: err?.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [search, formatFilter]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDownload = async (file: StorageFile) => {
    try {
      toast.loading(`Preparing ${file.fileName} download...`, { id: 'download' });
      const res = await apiClient.get(`/v1/storage/files/${file._id}/download`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: file.mimeType || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Downloaded ${file.fileName}`, { id: 'download' });
    } catch (err: any) {
      toast.error('Download failed', {
        id: 'download',
        description: err?.response?.data?.message || err.message,
      });
    }
  };

  const handlePreview = async (file: StorageFile) => {
    setSelectedFile(file);
    setPreviewContent(file.fileContent || '');
    setLoadingPreview(true);
    try {
      const res = await apiClient.get(`/v1/storage/files/${file._id}/preview`);
      if (res.data?.data?.fileContent) {
        setPreviewContent(res.data.data.fileContent);
      }
    } catch (err: any) {
      toast.error('Failed to load file content preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDelete = async (file: StorageFile) => {
    if (!confirm(`Are you sure you want to delete file "${file.fileName}" from Data Vault?`)) return;
    try {
      await apiClient.delete(`/v1/storage/files/${file._id}`);
      toast.success('File deleted');
      if (selectedFile?._id === file._id) setSelectedFile(null);
      fetchFiles();
    } catch (err: any) {
      toast.error('Failed to delete file', {
        description: err?.response?.data?.message || err.message,
      });
    }
  };

  const handleCopyContent = () => {
    if (!previewContent) return;
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    toast.success('Content copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFormatBadgeColor = (format: string) => {
    switch (format.toLowerCase()) {
      case 'csv':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'json':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'pdf':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'html':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
      case 'json':
        return <FileCode className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderDown className="w-7 h-7 text-indigo-400" />
            <Heading as="h1">Data Vault & Local Storage</Heading>
          </div>
          <Text className="text-textSecondary mt-1">
            Persistent MongoDB BSON dataset storage & local outputs generated by AutoFlow V2 executions.
          </Text>
        </div>

        <button
          onClick={fetchFiles}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-bgCard hover:bg-white/5 border border-borderColor text-xs text-white font-medium transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Vault
        </button>
      </div>

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SectionCard className="p-4 bg-bgCard/60 border border-borderColor relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Total Documents</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalFiles || 0}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-4 bg-bgCard/60 border border-borderColor relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Storage Capacity</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatSize(stats.totalSizeBytes || 0)}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-4 bg-bgCard/60 border border-borderColor relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider">CSV Datasets</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.formatCounts?.csv || 0}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-4 bg-bgCard/60 border border-borderColor relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider">JSON Documents</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.formatCounts?.json || 0}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileCode className="w-5 h-5" />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name, format, or operation..."
            className="w-full pl-9 pr-4 py-2 bg-bgCard border border-borderColor rounded-lg text-sm text-white placeholder-textSecondary focus:outline-none focus:border-indigo-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-bgCard border border-borderColor rounded-lg text-xs text-textSecondary">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Format:</span>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-bgSecondary text-white">All Formats</option>
              <option value="csv" className="bg-bgSecondary text-white">CSV Datasets</option>
              <option value="json" className="bg-bgSecondary text-white">JSON Files</option>
              <option value="txt" className="bg-bgSecondary text-white">Text (TXT)</option>
              <option value="html" className="bg-bgSecondary text-white">HTML Pages</option>
              <option value="pdf" className="bg-bgSecondary text-white">PDF Documents</option>
              <option value="md" className="bg-bgSecondary text-white">Markdown</option>
            </select>
          </div>
        </div>
      </div>

      {/* Files Table */}
      <SectionCard className="p-0 overflow-hidden bg-bgCard border border-borderColor">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-textSecondary">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-sm">Fetching Data Vault files...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
              <FolderDown className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No files stored in Data Vault</h3>
            <p className="text-xs text-textSecondary max-w-md mb-6">
              When workflows execute with <strong>Data Vault & Local Storage</strong> steps (<code className="text-indigo-300">save_document</code> or <code className="text-indigo-300">append_csv_dataset</code>), output files will automatically appear here for instant download.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-borderColor bg-white/[0.02] text-textSecondary uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Operation</th>
                  <th className="py-3 px-4">Size & Rows</th>
                  <th className="py-3 px-4">Saved At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor/60">
                {files.map((file) => (
                  <tr key={file._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/5 border border-borderColor">
                          {getFormatIcon(file.format)}
                        </div>
                        <div>
                          <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                            {file.fileName}
                          </p>
                          <p className="text-[10px] text-textSecondary font-mono mt-0.5">
                            ID: {file._id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono font-medium uppercase ${getFormatBadgeColor(file.format)}`}>
                        {file.format}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-textSecondary">
                        <Layers className="w-3 h-3 text-indigo-400" />
                        <code className="text-[11px] text-slate-300">{file.operation}</code>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-textSecondary font-mono">
                      <div>{formatSize(file.sizeBytes)}</div>
                      {file.rowCount !== undefined && (
                        <div className="text-[10px] text-emerald-400 font-sans mt-0.5">
                          {file.rowCount} rows
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-textSecondary">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-textSecondary" />
                        <span>{new Date(file.createdAt).toLocaleString()}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePreview(file)}
                          title="Preview Content"
                          className="p-1.5 rounded-md text-textSecondary hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(file)}
                          title="Download File"
                          className="p-1.5 rounded-md text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          title="Delete File"
                          className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Preview Modal Drawer */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bgSecondary border border-borderColor rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-borderColor flex items-center justify-between bg-bgCard">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-borderColor">
                  {getFormatIcon(selectedFile.format)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    {selectedFile.fileName}
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${getFormatBadgeColor(selectedFile.format)}`}>
                      {selectedFile.format}
                    </span>
                  </h3>
                  <p className="text-xs text-textSecondary mt-0.5">
                    Size: {formatSize(selectedFile.sizeBytes)} • Saved: {new Date(selectedFile.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyContent}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-borderColor text-xs text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Raw'}</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedFile)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-lg text-textSecondary hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="p-4 flex-1 overflow-y-auto bg-black/40 font-mono text-xs text-slate-200">
              {loadingPreview ? (
                <div className="p-12 flex flex-col items-center justify-center gap-2 text-textSecondary">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Loading file buffer...</span>
                </div>
              ) : previewContent ? (
                <pre className="whitespace-pre-wrap break-all leading-relaxed p-3 rounded bg-bgCard/60 border border-borderColor/60">
                  {previewContent}
                </pre>
              ) : (
                <div className="p-8 text-center text-textSecondary">
                  No preview available or file content empty.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
