import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import {
  Folder,
  FileCode,
  FileArchive,
  FileText,
  FileImage,
  Upload,
  Trash2,
  Edit3,
  Download,
  Archive,
  RefreshCw,
  Search,
  ChevronRight,
  MoreVertical,
  FilePlus,
  FolderPlus,
  X,
  Loader2,
  FolderArchive,
  Home,
  CheckSquare,
  Square,
  Grid,
  List,
  ArrowUpDown,
  CornerLeftUp,
  Filter,
  Check,
  ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';
import { FileItem, BreadcrumbItem } from '../../types';
import { CodeEditorModal } from './CodeEditorModal';

interface FileTableProps {
  initialPath?: string;
}

type ViewMode = 'table' | 'grid';
type FilterCategory = 'all' | 'dir' | 'code' | 'image' | 'archive';
type SortField = 'name' | 'size' | 'mtime';
type SortOrder = 'asc' | 'desc';

export const FileTable: React.FC<FileTableProps> = ({ initialPath = '' }) => {
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'public_html';
  const [items, setItems] = useState<FileItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [editingFile, setEditingFile] = useState<string | null>(null);

  // View & Filter States
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('serverdeck_fm_view') as ViewMode) || 'table';
  });
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [activeMenuPath, setActiveMenuPath] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<'file' | 'dir' | null>(null);
  const [newItemName, setNewItemName] = useState<string>('');
  const [showRenameModal, setShowRenameModal] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [showChmodModal, setShowChmodModal] = useState<FileItem | null>(null);
  const [chmodValue, setChmodValue] = useState<string>('0644');
  const [showDeleteModal, setShowDeleteModal] = useState<FileItem | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState<boolean>(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState<boolean>(false);
  const [showZipModal, setShowZipModal] = useState<boolean>(false);
  const [zipNameValue, setZipNameValue] = useState<string>('archive.zip');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setActiveMenuPath(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('serverdeck_fm_view', mode);
  };

  const loadDirectory = async (path = currentPath) => {
    setLoading(true);
    setActionError('');
    setActiveMenuPath(null);
    try {
      const data = await api.fetchFiles(path);
      setItems(data.items);
      setBreadcrumbs(data.breadcrumbs);
      setCurrentPath(data.current_path);
      setSelectedItems([]);
      setLoading(false);
    } catch (err: any) {
      setActionError(err.message || 'Gagal memuat direktori');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  // Determine if item is editable in code editor
  const isEditable = (item: FileItem) => {
    if (item.is_dir) return false;
    const editableExtensions = [
      'php', 'js', 'ts', 'jsx', 'tsx', 'html', 'htm', 'css', 'scss',
      'json', 'env', 'htaccess', 'txt', 'md', 'sh', 'yml', 'yaml',
      'xml', 'sql', 'conf', 'ini', 'sample', 'lock'
    ];
    return editableExtensions.includes(item.extension.toLowerCase()) || item.name.startsWith('.');
  };

  // Filter & Sort Items
  const processedItems = useMemo(() => {
    let result = [...items];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(query));
    }

    // 2. Category Filter
    if (filterCategory === 'dir') {
      result = result.filter((item) => item.is_dir);
    } else if (filterCategory === 'code') {
      result = result.filter((item) => isEditable(item));
    } else if (filterCategory === 'image') {
      const imgExts = ['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif', 'ico'];
      result = result.filter((item) => imgExts.includes(item.extension.toLowerCase()));
    } else if (filterCategory === 'archive') {
      const arcExts = ['zip', 'tar', 'gz', 'bz2', '7z', 'rar'];
      result = result.filter((item) => arcExts.includes(item.extension.toLowerCase()));
    }

    // 3. Sorting (Always keep folders at top)
    result.sort((a, b) => {
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;

      let compareVal = 0;
      if (sortField === 'name') {
        compareVal = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'size') {
        compareVal = (a.size || 0) - (b.size || 0);
      } else if (sortField === 'mtime') {
        compareVal = (a.mtime || 0) - (b.mtime || 0);
      }

      return sortOrder === 'asc' ? compareVal : -compareVal;
    });

    return result;
  }, [items, searchQuery, filterCategory, sortField, sortOrder]);

  const toggleSelectAll = () => {
    if (selectedItems.length === processedItems.length && processedItems.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(processedItems.map((i) => i.path));
    }
  };

  const toggleSelectItem = (path: string) => {
    setSelectedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleCreate = async () => {
    if (!newItemName.trim() || !showCreateModal) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.createItem(currentPath, newItemName.trim(), showCreateModal);
      setShowCreateModal(null);
      setNewItemName('');
      setActionLoading(false);
      loadDirectory(currentPath);
    } catch (err: any) {
      setActionError(err.message || 'Gagal membuat item baru');
      setActionLoading(false);
    }
  };

  const handleRename = async () => {
    if (!showRenameModal || !renameValue.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.renameItem(showRenameModal.path, renameValue.trim());
      setShowRenameModal(null);
      setActionLoading(false);
      loadDirectory(currentPath);
    } catch (err: any) {
      setActionError(err.message || 'Gagal mengubah nama');
      setActionLoading(false);
    }
  };

  const handleChmod = async () => {
    if (!showChmodModal || !chmodValue.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.chmodItem(showChmodModal.path, chmodValue.trim());
      setShowChmodModal(null);
      setActionLoading(false);
      loadDirectory(currentPath);
    } catch (err: any) {
      setActionError(err.message || 'Gagal mengubah permission');
      setActionLoading(false);
    }
  };

  const handleDelete = async (targetPath: string) => {
    setActionLoading(true);
    setActionError('');
    try {
      await api.deleteItem(targetPath);
      setShowDeleteModal(null);
      setActionLoading(false);
      loadDirectory(currentPath);
    } catch (err: any) {
      setActionError(err.message || 'Gagal menghapus item');
      setActionLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return;
    setActionLoading(true);
    setActionError('');
    try {
      for (const itemPath of selectedItems) {
        await api.deleteItem(itemPath);
      }
      setShowBatchDeleteModal(false);
      setSelectedItems([]);
      setActionLoading(false);
      loadDirectory(currentPath);
    } catch (err: any) {
      setActionError(err.message || 'Gagal menghapus beberapa item terpilih');
      setActionLoading(false);
    }
  };

  const handleZipSelected = async () => {
    if (selectedItems.length === 0 || !zipNameValue.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.zipItems(currentPath, selectedItems, zipNameValue.trim());
      setShowZipModal(false);
      setSelectedItems([]);
      setActionLoading(false);
      loadDirectory(currentPath);
    } catch (err: any) {
      setActionError(err.message || 'Gagal membuat arsip ZIP');
      setActionLoading(false);
    }
  };

  const handleUnzip = async (zipItem: FileItem) => {
    if (!confirm(`Ekstrak arsip ${zipItem.name} ke folder saat ini?`)) return;
    setLoading(true);
    try {
      await api.unzipItem(zipItem.path, currentPath);
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekstrak arsip');
      setLoading(false);
    }
  };

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    setActionError('');
    try {
      await api.uploadFiles(currentPath, fileList);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDirectory(currentPath);
    } catch (err: any) {
      setActionError(err.message || 'Gagal mengunggah file');
      setIsUploading(false);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Navigate to parent folder
  const handleGoUp = () => {
    if (breadcrumbs.length <= 1) return;
    const parent = breadcrumbs[breadcrumbs.length - 2];
    setCurrentPath(parent.path);
  };

  const getFileIcon = (item: FileItem, sizeClass = "w-4 h-4") => {
    if (item.is_dir) {
      return (
        <div className="p-1.5 rounded-lg bg-cobalt-500/10 text-cobalt-400 border border-cobalt-500/20 flex-shrink-0 shadow-sm">
          <Folder className={sizeClass} />
        </div>
      );
    }
    const ext = item.extension.toLowerCase();
    if (['php'].includes(ext)) {
      return (
        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex-shrink-0 shadow-sm">
          <FileCode className={sizeClass} />
        </div>
      );
    }
    if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
      return (
        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0 shadow-sm">
          <FileCode className={sizeClass} />
        </div>
      );
    }
    if (['html', 'htm'].includes(ext)) {
      return (
        <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 flex-shrink-0 shadow-sm">
          <FileCode className={sizeClass} />
        </div>
      );
    }
    if (['css', 'scss'].includes(ext)) {
      return (
        <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex-shrink-0 shadow-sm">
          <FileCode className={sizeClass} />
        </div>
      );
    }
    if (['json', 'yml', 'yaml', 'xml', 'sql', 'sh', 'env', 'conf', 'ini'].includes(ext)) {
      return (
        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0 shadow-sm">
          <FileCode className={sizeClass} />
        </div>
      );
    }
    if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar'].includes(ext)) {
      return (
        <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex-shrink-0 shadow-sm">
          <FileArchive className={sizeClass} />
        </div>
      );
    }
    if (['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif', 'ico'].includes(ext)) {
      return (
        <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 flex-shrink-0 shadow-sm">
          <FileImage className={sizeClass} />
        </div>
      );
    }
    return (
      <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 border border-white/5 flex-shrink-0 shadow-sm">
        <FileText className={sizeClass} />
      </div>
    );
  };

  return (
    <div
      className="space-y-4 animate-fade-in relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-cobalt-950/80 backdrop-blur-md border-4 border-dashed border-cobalt-500 flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <Upload className="w-16 h-16 text-cobalt-400 animate-bounce mb-3" />
          <h2 className="text-xl font-bold text-white">Lepaskan file di sini</h2>
          <p className="text-sm text-zinc-400 font-mono mt-1">File akan diunggah ke folder: {currentPath || '~ (Home)'}</p>
        </div>
      )}

      {/* 1. Header: Breadcrumbs & Path Navigation */}
      <div className="glass-panel rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-white/10 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs sm:text-sm font-mono scrollbar-none py-1 min-h-[36px]">
          {/* Folder Up Button */}
          {breadcrumbs.length > 1 && (
            <button
              onClick={handleGoUp}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-white/10 interactive-tap transition-colors flex-shrink-0 mr-1"
              title="Folder Sebelumnya (Naik 1 Level)"
            >
              <CornerLeftUp className="w-4 h-4 text-cobalt-400" />
            </button>
          )}

          <button
            onClick={() => setCurrentPath('')}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
            title="Root Home"
          >
            <Home className="w-4 h-4" />
          </button>

          {breadcrumbs.map((crumb, idx) => (
            <Fragment key={crumb.path || 'root'}>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
              <button
                onClick={() => setCurrentPath(crumb.path)}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap text-xs ${
                  idx === breadcrumbs.length - 1
                    ? 'text-white font-semibold bg-white/10 border border-white/10 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {crumb.name}
              </button>
            </Fragment>
          ))}
        </div>

        {/* Quick Shortcut Badges */}
        <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto scrollbar-none flex-shrink-0 pt-1 md:pt-0">
          <span className="text-zinc-500 mr-1 text-[11px] hidden sm:inline">Pintas:</span>
          <button
            onClick={() => setCurrentPath('')}
            className={`px-2.5 py-1 rounded-lg border interactive-tap text-xs transition-all ${
              currentPath === ''
                ? 'bg-cobalt-600/20 text-cobalt-300 border-cobalt-500/30'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/5'
            }`}
          >
            ~ Home
          </button>
          <button
            onClick={() => setCurrentPath(currentHostname)}
            className={`px-2.5 py-1 rounded-lg border interactive-tap text-xs transition-all ${
              currentPath === currentHostname
                ? 'bg-cobalt-600/20 text-cobalt-300 border-cobalt-500/30'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/5'
            }`}
          >
            {currentHostname}
          </button>
          <button
            onClick={() => setCurrentPath('public_html')}
            className={`px-2.5 py-1 rounded-lg border interactive-tap text-xs transition-all ${
              currentPath === 'public_html'
                ? 'bg-cobalt-600/20 text-cobalt-300 border-cobalt-500/30'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/5'
            }`}
          >
            public_html
          </button>
        </div>
      </div>

      {/* 2. Main Action Toolbar (Responsive, Intuitive, Clean) */}
      <div className="glass-panel rounded-2xl p-3 sm:p-4 flex flex-col gap-3.5 border border-white/10 shadow-sm">
        {/* Top Toolbar Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setShowCreateModal('file');
                setNewItemName('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-100 rounded-xl border border-white/10 interactive-tap transition-all shadow-sm"
            >
              <FilePlus className="w-3.5 h-3.5 text-status-amber" />
              <span>File Baru</span>
            </button>

            <button
              onClick={() => {
                setShowCreateModal('dir');
                setNewItemName('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-100 rounded-xl border border-white/10 interactive-tap transition-all shadow-sm"
            >
              <FolderPlus className="w-3.5 h-3.5 text-cobalt-400" />
              <span>Folder Baru</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-100 rounded-xl border border-white/10 cursor-pointer interactive-tap transition-all shadow-sm">
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cobalt-400" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-status-emerald" />
              )}
              <span>{isUploading ? 'Mengunggah...' : 'Upload File'}</span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleUploadFiles(e.target.files);
                }}
                disabled={isUploading}
              />
            </label>

            <button
              onClick={() => loadDirectory(currentPath)}
              disabled={loading}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/10 interactive-tap transition-all"
              title="Segarkan Direktori"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cobalt-400' : ''}`} />
            </button>
          </div>

          {/* Search Bar & View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari file / folder..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cobalt-500 font-mono transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle (Grid vs Table) */}
            <div className="flex items-center rounded-xl bg-black/40 border border-white/10 p-1 flex-shrink-0">
              <button
                onClick={() => handleSetViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
                title="Tampilan Tabel (List View)"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
                title="Tampilan Grid (Card View)"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills & Sort Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-white/5 text-xs font-mono">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-zinc-500 text-[11px] mr-1 hidden sm:inline flex-shrink-0">Filter:</span>
            {[
              { id: 'all' as FilterCategory, label: 'Semua' },
              { id: 'dir' as FilterCategory, label: 'Folder' },
              { id: 'code' as FilterCategory, label: 'Script / Code' },
              { id: 'image' as FilterCategory, label: 'Gambar' },
              { id: 'archive' as FilterCategory, label: 'Arsip ZIP' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterCategory(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${
                  filterCategory === f.id
                    ? 'bg-cobalt-600 text-white font-medium shadow-sm'
                    : 'bg-slate-100 dark:bg-zinc-900/60 hover:bg-slate-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort Selector & Item Count */}
          <div className="flex items-center gap-3 justify-between sm:justify-end text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="tabular-nums">
              {processedItems.length} item {searchQuery || filterCategory !== 'all' ? `(dari ${items.length})` : ''}
            </span>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/5">
              <ArrowUpDown className="w-3 h-3 text-zinc-500" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="bg-transparent border-none text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer text-xs font-mono"
              >
                <option value="name" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Nama (A-Z)</option>
                <option value="size" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Ukuran File</option>
                <option value="mtime" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Waktu Diubah</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-bold ml-1 px-1"
                title={`Urutan: ${sortOrder === 'asc' ? 'Menaik (A-Z / Terkecil)' : 'Menurun (Z-A / Terbesar)'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="bg-status-rose/10 border border-status-rose/30 text-status-rose text-xs font-mono p-3.5 rounded-xl flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="p-1 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Files Container: TABLE VIEW or GRID VIEW */}
      <div ref={menuContainerRef}>
        {loading ? (
          <div className="glass-card rounded-2xl border border-white/10 p-16 flex flex-col items-center justify-center text-zinc-400 font-mono text-xs gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-cobalt-500" />
            <span>Memuat berkas dari direktori...</span>
          </div>
        ) : processedItems.length === 0 ? (
          <div className="glass-card rounded-2xl border border-white/10 p-16 text-center text-zinc-500 font-mono text-xs space-y-2">
            <Folder className="w-10 h-10 mx-auto text-zinc-600 opacity-50" />
            <p className="text-zinc-300 font-medium text-sm">Tidak ada file atau folder ditemukan.</p>
            <p className="text-zinc-500 text-xs">
              {searchQuery || filterCategory !== 'all'
                ? 'Coba hapus filter atau kata kunci pencarian.'
                : 'Folder ini masih kosong. Klik "Upload File" atau "File Baru" di atas.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* ================= GRID CARD VIEW ================= */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-3.5">
            {processedItems.map((item) => {
              const isChecked = selectedItems.includes(item.path);
              const isMenuOpen = activeMenuPath === item.path;

              return (
                <div
                  key={item.path}
                  className={`glass-card rounded-2xl p-3 sm:p-4 border transition-all duration-200 relative group flex flex-col justify-between select-none ${
                    isChecked
                      ? 'border-cobalt-500 bg-cobalt-600/10 shadow-glow-cobalt'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Top card bar: Checkbox & Menu button */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectItem(item.path);
                      }}
                      className="p-1 text-zinc-500 hover:text-white rounded-md transition-colors"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-cobalt-400" />
                      ) : (
                        <Square className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                      )}
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuPath(isMenuOpen ? null : item.path);
                        }}
                        className="p-1 text-zinc-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                        title="Opsi Berkas"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Item Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 glass-panel rounded-xl border border-slate-200 dark:border-white/15 p-1.5 shadow-2xl z-30 font-mono text-xs animate-fade-in bg-white dark:bg-zinc-950">
                          {isEditable(item) && (
                            <button
                              onClick={() => {
                                setEditingFile(item.path);
                                setActiveMenuPath(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-status-amber text-left transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Kode</span>
                            </button>
                          )}

                          {!item.is_dir && (
                            <a
                              href={api.getDownloadUrl(item.path)}
                              download={item.name}
                              onClick={() => setActiveMenuPath(null)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-cobalt-600 dark:hover:text-cobalt-400 text-left transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Unduh File</span>
                            </a>
                          )}

                          {item.extension.toLowerCase() === 'zip' && (
                            <button
                              onClick={() => {
                                handleUnzip(item);
                                setActiveMenuPath(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-status-emerald text-left transition-colors"
                            >
                              <FolderArchive className="w-3.5 h-3.5" />
                              <span>Ekstrak ZIP</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setShowRenameModal(item);
                              setRenameValue(item.name);
                              setActiveMenuPath(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white text-left transition-colors"
                          >
                            <span className="text-[11px]">🏷️</span>
                            <span>Ubah Nama</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowChmodModal(item);
                              setChmodValue(item.perms);
                              setActiveMenuPath(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white text-left transition-colors"
                          >
                            <span className="text-[11px]">🔒</span>
                            <span>Chmod ({item.perms})</span>
                          </button>

                          <div className="h-px bg-white/5 my-1" />

                          <button
                            onClick={() => {
                              setShowDeleteModal(item);
                              setActiveMenuPath(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-status-rose hover:bg-status-rose/15 text-left transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Icon & File/Folder Click Area */}
                  <div
                    onClick={() => {
                      if (item.is_dir) {
                        setCurrentPath(item.path);
                      } else if (isEditable(item)) {
                        setEditingFile(item.path);
                      }
                    }}
                    className="flex flex-col items-center text-center cursor-pointer my-2 py-2 group-hover:scale-105 transition-transform"
                  >
                    <div className="mb-2">
                      {getFileIcon(item, "w-8 h-8")}
                    </div>
                    <span
                      className="text-xs font-semibold text-zinc-100 max-w-full break-all line-clamp-2 leading-tight"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>

                  {/* Card Footer: Size & Date */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span className="truncate">{item.is_dir ? 'Folder' : item.formatted_size}</span>
                    <span className="bg-white/5 px-1.5 py-0.5 rounded text-zinc-400">{item.perms}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= TABLE / LIST VIEW ================= */
          <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-950/80 border-b border-white/10 text-zinc-400 font-semibold">
                  <tr>
                    <th className="py-3 px-3.5 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-zinc-500 hover:text-white"
                        title="Pilih Semua Item"
                      >
                        {selectedItems.length > 0 && selectedItems.length === processedItems.length ? (
                          <CheckSquare className="w-4 h-4 text-cobalt-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3">Nama</th>
                    <th className="py-3 px-3 w-28 text-right hidden sm:table-cell">Ukuran</th>
                    <th className="py-3 px-3 w-24 text-center hidden md:table-cell">Perms</th>
                    <th className="py-3 px-3 w-40 text-right hidden lg:table-cell">Modifikasi</th>
                    <th className="py-3 px-4 w-32 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {processedItems.map((item) => {
                    const isChecked = selectedItems.includes(item.path);
                    const isMenuOpen = activeMenuPath === item.path;

                    return (
                      <tr
                        key={item.path}
                        className={`hover:bg-white/[0.03] transition-colors group ${
                          isChecked ? 'bg-cobalt-600/10' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3.5">
                          <button
                            type="button"
                            onClick={() => toggleSelectItem(item.path)}
                            className="text-zinc-500 hover:text-white"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-cobalt-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5 max-w-xs sm:max-w-md lg:max-w-lg">
                            {getFileIcon(item)}
                            {item.is_dir ? (
                              <button
                                onClick={() => setCurrentPath(item.path)}
                                className="text-zinc-900 dark:text-white hover:text-cobalt-600 dark:hover:text-cobalt-400 font-semibold truncate text-left transition-colors"
                              >
                                {item.name}
                              </button>
                            ) : isEditable(item) ? (
                              <button
                                onClick={() => setEditingFile(item.path)}
                                className="text-zinc-700 dark:text-zinc-200 hover:text-status-amber font-normal truncate text-left transition-colors"
                                title="Klik untuk mengedit file"
                              >
                                {item.name}
                              </button>
                            ) : (
                              <span className="text-zinc-700 dark:text-zinc-300 truncate">{item.name}</span>
                            )}
                          </div>
                          {/* Mobile subline for size & date */}
                          <div className="sm:hidden text-[10px] text-zinc-500 font-mono mt-0.5 flex items-center gap-2">
                            <span>{item.is_dir ? 'Folder' : item.formatted_size}</span>
                            <span>•</span>
                            <span>{item.perms}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right text-zinc-400 tabular-nums text-[11px] hidden sm:table-cell">
                          {item.is_dir ? '-' : item.formatted_size}
                        </td>

                        <td className="py-2.5 px-3 text-center hidden md:table-cell">
                          <button
                            onClick={() => {
                              setShowChmodModal(item);
                              setChmodValue(item.perms);
                            }}
                            className="text-zinc-400 hover:text-white px-2 py-0.5 rounded-md bg-white/5 border border-white/5 hover:border-white/20 text-[11px] transition-all"
                            title="Ubah Permission"
                          >
                            {item.perms}
                          </button>
                        </td>

                        <td className="py-2.5 px-3 text-right text-zinc-500 tabular-nums whitespace-nowrap text-[11px] hidden lg:table-cell">
                          {item.formatted_date}
                        </td>

                        <td className="py-2.5 px-4 text-right relative">
                          <div className="flex items-center justify-end gap-1">
                            {/* Desktop Quick Inline Actions */}
                            {isEditable(item) && (
                              <button
                                onClick={() => setEditingFile(item.path)}
                                className="p-1.5 text-zinc-400 hover:text-status-amber hover:bg-white/5 rounded-lg transition-colors hidden sm:inline-flex"
                                title="Edit File"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {!item.is_dir && (
                              <a
                                href={api.getDownloadUrl(item.path)}
                                download={item.name}
                                className="p-1.5 text-zinc-400 hover:text-cobalt-400 hover:bg-white/5 rounded-lg transition-colors hidden sm:inline-flex"
                                title="Download File"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {item.extension.toLowerCase() === 'zip' && (
                              <button
                                onClick={() => handleUnzip(item)}
                                className="p-1.5 text-zinc-400 hover:text-status-emerald hover:bg-white/5 rounded-lg transition-colors hidden sm:inline-flex"
                                title="Ekstrak ZIP"
                              >
                                <FolderArchive className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Dropdown Kebab Menu */}
                            <div className="relative inline-block">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuPath(isMenuOpen ? null : item.path);
                                }}
                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="Menu Aksi"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-44 glass-panel rounded-xl border border-slate-200 dark:border-white/15 p-1.5 shadow-2xl z-30 font-mono text-xs animate-fade-in bg-white dark:bg-zinc-950 text-left">
                                  {isEditable(item) && (
                                    <button
                                      onClick={() => {
                                        setEditingFile(item.path);
                                        setActiveMenuPath(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-status-amber text-left transition-colors sm:hidden"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Edit Kode</span>
                                    </button>
                                  )}

                                  {!item.is_dir && (
                                    <a
                                      href={api.getDownloadUrl(item.path)}
                                      download={item.name}
                                      onClick={() => setActiveMenuPath(null)}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-cobalt-600 dark:hover:text-cobalt-400 text-left transition-colors sm:hidden"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Unduh File</span>
                                    </a>
                                  )}

                                  {item.extension.toLowerCase() === 'zip' && (
                                    <button
                                      onClick={() => {
                                        handleUnzip(item);
                                        setActiveMenuPath(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-status-emerald text-left transition-colors sm:hidden"
                                    >
                                      <FolderArchive className="w-3.5 h-3.5" />
                                      <span>Ekstrak ZIP</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setShowRenameModal(item);
                                      setRenameValue(item.name);
                                      setActiveMenuPath(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white text-left transition-colors"
                                  >
                                    <span className="text-[11px]">🏷️</span>
                                    <span>Ubah Nama</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setShowChmodModal(item);
                                      setChmodValue(item.perms);
                                      setActiveMenuPath(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white text-left transition-colors"
                                  >
                                    <span className="text-[11px]">🔒</span>
                                    <span>Chmod ({item.perms})</span>
                                  </button>

                                  <div className="h-px bg-slate-200 dark:bg-white/5 my-1" />

                                  <button
                                    onClick={() => {
                                      setShowDeleteModal(item);
                                      setActiveMenuPath(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-status-rose hover:bg-status-rose/15 text-left transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Floating Multi-Selection Action Bar */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/95 border border-white/15 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 pr-3 border-r border-white/10">
            <span className="w-2 h-2 rounded-full bg-cobalt-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {selectedItems.length} dipilih
            </span>
          </div>

          <button
            onClick={() => {
              setZipNameValue('archive.zip');
              setShowZipModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-xl interactive-tap shadow-sm"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Kompres ZIP</span>
          </button>

          <button
            onClick={() => setShowBatchDeleteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold bg-status-rose/20 hover:bg-status-rose/30 text-status-rose border border-status-rose/30 rounded-xl interactive-tap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hapus</span>
          </button>

          <button
            onClick={() => setSelectedItems([])}
            className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors ml-1"
            title="Batalkan Pilihan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. Modals & Dialogs */}
      {/* Code Editor Modal */}
      {editingFile && (
        <CodeEditorModal
          filePath={editingFile}
          onClose={() => setEditingFile(null)}
          onSaved={() => loadDirectory(currentPath)}
        />
      )}

      {/* Modal: Create File / Folder */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                {showCreateModal === 'dir' ? <FolderPlus className="w-4 h-4 text-cobalt-600 dark:text-cobalt-400" /> : <FilePlus className="w-4 h-4 text-status-amber" />}
                <span>{showCreateModal === 'dir' ? 'Buat Folder Baru' : 'Buat File Baru'}</span>
              </h3>
              <button onClick={() => setShowCreateModal(null)} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={showCreateModal === 'dir' ? 'contoh_folder' : 'index.php'}
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-500/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowCreateModal(null)}
                className="px-4 py-2 text-xs font-mono text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading || !newItemName.trim()}
                className="px-4 py-2 text-xs font-mono font-semibold bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-cobalt-600/25 disabled:opacity-50 transition-all"
              >
                {actionLoading ? 'Menyimpan...' : 'Buat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rename */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Ubah Nama Item</h3>
              <button onClick={() => setShowRenameModal(null)} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 font-mono truncate">{showRenameModal.name}</p>
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-500/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowRenameModal(null)}
                className="px-4 py-2 text-xs font-mono text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleRename}
                disabled={actionLoading || !renameValue.trim()}
                className="px-4 py-2 text-xs font-mono font-semibold bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-cobalt-600/25 disabled:opacity-50 transition-all"
              >
                {actionLoading ? 'Menyimpan...' : 'Perbarui'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chmod */}
      {showChmodModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Ubah Permission (chmod)</h3>
              <button onClick={() => setShowChmodModal(null)} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 font-mono truncate">{showChmodModal.name}</p>
            <input
              type="text"
              autoFocus
              value={chmodValue}
              onChange={(e) => setChmodValue(e.target.value)}
              placeholder="0755 atau 0644"
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-500/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleChmod();
              }}
            />
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
              <button
                type="button"
                onClick={() => setChmodValue('0644')}
                className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 text-zinc-700 dark:text-zinc-300 text-left transition-colors"
              >
                <span className="font-bold text-zinc-900 dark:text-white block">0644</span>
                <span className="text-zinc-500 text-[10px]">Standar File PHP/HTML</span>
              </button>
              <button
                type="button"
                onClick={() => setChmodValue('0755')}
                className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 text-zinc-700 dark:text-zinc-300 text-left transition-colors"
              >
                <span className="font-bold text-zinc-900 dark:text-white block">0755</span>
                <span className="text-zinc-500 text-[10px]">Standar Folder / Script</span>
              </button>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowChmodModal(null)}
                className="px-4 py-2 text-xs font-mono text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleChmod}
                disabled={actionLoading || !chmodValue.trim()}
                className="px-4 py-2 text-xs font-mono font-semibold bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-cobalt-600/25 disabled:opacity-50 transition-all"
              >
                {actionLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Single Confirmation with Destructive Guardrail */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-status-rose pb-2 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Konfirmasi Hapus {showDeleteModal.is_dir ? 'Folder' : 'File'}</span>
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono">
              Apakah Anda yakin ingin menghapus <strong className="text-zinc-900 dark:text-white font-bold">{showDeleteModal.name}</strong>?
              {showDeleteModal.is_dir && (
                <span className="block mt-2 text-status-amber bg-status-amber/10 p-2.5 rounded-xl border border-status-amber/25 text-[11px] leading-relaxed">
                  Peringatan: Seluruh file dan sub-folder di dalam direktori ini akan dihapus secara permanen.
                </span>
              )}
            </p>

            {showDeleteModal.is_dir && (
              <label className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none font-mono bg-slate-50 dark:bg-black/30 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-status-rose border-slate-300 dark:border-white/20 focus:ring-status-rose cursor-pointer"
                />
                <span>Saya memahami risiko penghapusan folder ini</span>
              </label>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(null);
                  setDeleteConfirmed(false);
                }}
                className="px-4 py-2 text-xs font-mono text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleDelete(showDeleteModal.path);
                  setDeleteConfirmed(false);
                }}
                disabled={actionLoading || (showDeleteModal.is_dir && !deleteConfirmed)}
                className="px-4 py-2 text-xs font-mono font-semibold bg-status-rose hover:bg-status-rose/80 text-white rounded-xl shadow-lg shadow-status-rose/25 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Menghapus...' : 'Hapus Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Batch Delete Confirmation with Destructive Guardrail */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-status-rose pb-2 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Hapus {selectedItems.length} Item Terpilih?</span>
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono">
              Tindakan ini akan menghapus semua {selectedItems.length} file dan folder yang sedang dicentang secara permanen dari server hosting Anda.
            </p>

            <label className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none font-mono bg-slate-50 dark:bg-black/30 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-status-rose border-slate-300 dark:border-white/20 focus:ring-status-rose cursor-pointer"
              />
              <span>Saya yakin ingin menghapus {selectedItems.length} item sekaligus</span>
            </label>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowBatchDeleteModal(false);
                  setDeleteConfirmed(false);
                }}
                className="px-4 py-2 text-xs font-mono text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleBatchDelete();
                  setDeleteConfirmed(false);
                }}
                disabled={actionLoading || !deleteConfirmed}
                className="px-4 py-2 text-xs font-mono font-semibold bg-status-rose hover:bg-status-rose/80 text-white rounded-xl shadow-lg shadow-status-rose/25 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Menghapus...' : `Hapus ${selectedItems.length} Item`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Zip Selected */}
      {showZipModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-status-amber" />
                <span>Kompres Item Terpilih (.zip)</span>
              </h3>
              <button onClick={() => setShowZipModal(false)} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              Mengompres {selectedItems.length} item ke dalam satu arsip ZIP:
            </p>
            <input
              type="text"
              autoFocus
              value={zipNameValue}
              onChange={(e) => setZipNameValue(e.target.value)}
              placeholder="archive.zip"
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-500/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleZipSelected();
              }}
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowZipModal(false)}
                className="px-4 py-2 text-xs font-mono text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleZipSelected}
                disabled={actionLoading || !zipNameValue.trim()}
                className="px-4 py-2 text-xs font-mono font-semibold bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-cobalt-600/25 disabled:opacity-50 transition-all"
              >
                {actionLoading ? 'Mengompres...' : 'Kompres Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
