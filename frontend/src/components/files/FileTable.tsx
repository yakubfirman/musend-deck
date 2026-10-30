import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
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
  FolderArchive
} from 'lucide-react';
import { api } from '../../services/api';
import { FileItem, BreadcrumbItem } from '../../types';
import { CodeEditorModal } from './CodeEditorModal';

interface FileTableProps {
  initialPath?: string;
}

export const FileTable: React.FC<FileTableProps> = ({ initialPath = '' }) => {
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const [items, setItems] = useState<FileItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [editingFile, setEditingFile] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<'file' | 'dir' | null>(null);
  const [newItemName, setNewItemName] = useState<string>('');
  const [showRenameModal, setShowRenameModal] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [showChmodModal, setShowChmodModal] = useState<FileItem | null>(null);
  const [chmodValue, setChmodValue] = useState<string>('0644');
  const [showDeleteModal, setShowDeleteModal] = useState<FileItem | null>(null);
  const [showZipModal, setShowZipModal] = useState<boolean>(false);
  const [zipNameValue, setZipNameValue] = useState<string>('archive.zip');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDirectory = async (path = currentPath) => {
    setLoading(true);
    setActionError('');
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

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map((i) => i.path));
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

  const handleZipSelected = async () => {
    if (selectedItems.length === 0 || !zipNameValue.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.zipItems(currentPath, selectedItems, zipNameValue.trim());
      setShowZipModal(false);
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

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setActionError('');
    try {
      await api.uploadFiles(currentPath, files);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDirectory(currentPath);
    } catch (err: any) {
      setActionError(err.message || 'Gagal mengunggah file');
      setIsUploading(false);
    }
  };

  const getFileIcon = (item: FileItem) => {
    if (item.is_dir) {
      return <Folder className="w-4 h-4 text-cobalt-500 flex-shrink-0" />;
    }
    const ext = item.extension;
    if (['php', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'sh', 'sql'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-status-amber flex-shrink-0" />;
    }
    if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar'].includes(ext)) {
      return <FileArchive className="w-4 h-4 text-status-rose flex-shrink-0" />;
    }
    if (['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif', 'ico'].includes(ext)) {
      return <FileImage className="w-4 h-4 text-status-emerald flex-shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />;
  };

  const isEditable = (item: FileItem) => {
    if (item.is_dir) return false;
    const editableExtensions = [
      'php', 'js', 'ts', 'jsx', 'tsx', 'html', 'htm', 'css', 'scss',
      'json', 'env', 'htaccess', 'txt', 'md', 'sh', 'yml', 'yaml',
      'xml', 'sql', 'conf', 'ini', 'sample', 'lock'
    ];
    return editableExtensions.includes(item.extension) || item.name.startsWith('.');
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Navigation Bar */}
      <div className="bg-canvas-surface border border-hairline rounded-lg p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs sm:text-sm font-mono scrollbar-none py-1">
          {breadcrumbs.map((crumb, idx) => (
            <Fragment key={crumb.path || 'root'}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />}
              <button
                onClick={() => setCurrentPath(crumb.path)}
                className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                  idx === breadcrumbs.length - 1
                    ? 'text-zinc-100 font-semibold bg-white/5'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {crumb.name}
              </button>
            </Fragment>
          ))}
        </div>

        {/* Quick Location Shortcuts */}
        <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto scrollbar-none flex-shrink-0">
          <span className="text-zinc-500 mr-1">Pintas:</span>
          <button
            onClick={() => setCurrentPath('')}
            className="px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 border border-white/5 interactive-tap"
          >
            ~ Home
          </button>
          <button
            onClick={() => setCurrentPath('musend.web.id')}
            className="px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 border border-white/5 interactive-tap"
          >
            musend.web.id
          </button>
          <button
            onClick={() => setCurrentPath('public_html')}
            className="px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 border border-white/5 interactive-tap"
          >
            public_html
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-canvas-surface border border-hairline rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setShowCreateModal('file');
              setNewItemName('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md border border-hairline interactive-tap"
          >
            <FilePlus className="w-3.5 h-3.5 text-status-amber" />
            <span>File Baru</span>
          </button>

          <button
            onClick={() => {
              setShowCreateModal('dir');
              setNewItemName('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md border border-hairline interactive-tap"
          >
            <FolderPlus className="w-3.5 h-3.5 text-cobalt-500" />
            <span>Folder Baru</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md border border-hairline cursor-pointer interactive-tap">
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cobalt-500" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-status-emerald" />
            )}
            <span>{isUploading ? 'Mengunggah...' : 'Upload File'}</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUploadFiles}
              disabled={isUploading}
            />
          </label>

          {selectedItems.length > 0 && (
            <button
              onClick={() => {
                setZipNameValue('archive.zip');
                setShowZipModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-cobalt-600/20 hover:bg-cobalt-600/30 text-cobalt-400 rounded-md border border-cobalt-600/30 interactive-tap"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Kompres ({selectedItems.length})</span>
            </button>
          )}

          <button
            onClick={() => loadDirectory(currentPath)}
            disabled={loading}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800/80 hover:bg-zinc-700 rounded-md border border-hairline interactive-tap"
            title="Muat Ulang Direktori"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari file / folder..."
            className="w-full bg-canvas-base border border-hairline rounded-md pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cobalt-600"
          />
        </div>
      </div>

      {actionError && (
        <div className="bg-status-rose/10 border border-status-rose/30 text-status-rose text-xs font-mono p-3 rounded-lg flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Files Table */}
      <div className="bg-canvas-surface border border-hairline rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas-elevated border-b border-hairline text-zinc-400 font-mono">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedItems.length === filteredItems.length}
                    onChange={toggleSelectAll}
                    className="rounded bg-zinc-800 border-zinc-700 text-cobalt-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">Nama</th>
                <th className="py-2.5 px-3 w-24 text-right">Ukuran</th>
                <th className="py-2.5 px-3 w-20 text-center">Perms</th>
                <th className="py-2.5 px-3 w-36 text-right">Modifikasi</th>
                <th className="py-2.5 px-3 w-32 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cobalt-500" />
                    <span>Memuat daftar item...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500">
                    Tidak ada file atau folder ditemukan.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isChecked = selectedItems.includes(item.path);
                  return (
                    <tr
                      key={item.path}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isChecked ? 'bg-cobalt-600/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectItem(item.path)}
                          className="rounded bg-zinc-800 border-zinc-700 text-cobalt-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2 max-w-md sm:max-w-lg">
                          {getFileIcon(item)}
                          {item.is_dir ? (
                            <button
                              onClick={() => setCurrentPath(item.path)}
                              className="text-zinc-100 hover:text-cobalt-400 font-medium truncate text-left"
                            >
                              {item.name}
                            </button>
                          ) : isEditable(item) ? (
                            <button
                              onClick={() => setEditingFile(item.path)}
                              className="text-zinc-100 hover:text-status-amber font-normal truncate text-left"
                              title="Klik untuk mengedit"
                            >
                              {item.name}
                            </button>
                          ) : (
                            <span className="text-zinc-300 truncate">{item.name}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right text-zinc-400 tabular-nums">
                        {item.formatted_size}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setShowChmodModal(item);
                            setChmodValue(item.perms);
                          }}
                          className="text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-800/40 border border-white/5 hover:border-white/10"
                        >
                          {item.perms}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-right text-zinc-500 tabular-nums whitespace-nowrap">
                        {item.formatted_date}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditable(item) && (
                            <button
                              onClick={() => setEditingFile(item.path)}
                              className="p-1 text-zinc-400 hover:text-status-amber hover:bg-zinc-800 rounded"
                              title="Edit File"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!item.is_dir && (
                            <a
                              href={api.getDownloadUrl(item.path)}
                              download={item.name}
                              className="p-1 text-zinc-400 hover:text-cobalt-400 hover:bg-zinc-800 rounded inline-block"
                              title="Download File"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {item.extension === 'zip' && (
                            <button
                              onClick={() => handleUnzip(item)}
                              className="p-1 text-zinc-400 hover:text-status-emerald hover:bg-zinc-800 rounded"
                              title="Ekstrak ZIP"
                            >
                              <FolderArchive className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setShowRenameModal(item);
                              setRenameValue(item.name);
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
                            title="Ubah Nama"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setShowDeleteModal(item)}
                            className="p-1 text-zinc-400 hover:text-status-rose hover:bg-zinc-800 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-canvas-surface border border-hairline rounded-lg w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-zinc-100">
                {showCreateModal === 'dir' ? 'Buat Folder Baru' : 'Buat File Baru'}
              </h3>
              <button onClick={() => setShowCreateModal(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={showCreateModal === 'dir' ? 'nama_folder' : 'script.php'}
              className="w-full bg-canvas-base border border-hairline rounded-md px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cobalt-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading || !newItemName.trim()}
                className="px-3 py-1.5 text-xs bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-md disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Buat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rename */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-canvas-surface border border-hairline rounded-lg w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-zinc-100">Ubah Nama</h3>
              <button onClick={() => setShowRenameModal(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full bg-canvas-base border border-hairline rounded-md px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cobalt-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRenameModal(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleRename}
                disabled={actionLoading || !renameValue.trim()}
                className="px-3 py-1.5 text-xs bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-md disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Perbarui'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chmod */}
      {showChmodModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-canvas-surface border border-hairline rounded-lg w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-zinc-100">Ubah Permission (chmod)</h3>
              <button onClick={() => setShowChmodModal(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 font-mono truncate">{showChmodModal.name}</p>
            <input
              type="text"
              autoFocus
              value={chmodValue}
              onChange={(e) => setChmodValue(e.target.value)}
              placeholder="0755 atau 0644"
              className="w-full bg-canvas-base border border-hairline rounded-md px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cobalt-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleChmod();
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowChmodModal(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleChmod}
                disabled={actionLoading || !chmodValue.trim()}
                className="px-3 py-1.5 text-xs bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-md disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-canvas-surface border border-hairline rounded-lg w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-semibold text-status-rose">Konfirmasi Hapus</h3>
            <p className="text-xs text-zinc-300">
              Apakah Anda yakin ingin menghapus <strong className="font-mono text-white">{showDeleteModal.name}</strong>?
              {showDeleteModal.is_dir && ' Seluruh isi di dalam folder ini juga akan terhapus.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal.path)}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs bg-status-rose hover:bg-status-rose/80 text-white rounded-md disabled:opacity-50"
              >
                {actionLoading ? 'Menghapus...' : 'Hapus Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Zip Selected */}
      {showZipModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-canvas-surface border border-hairline rounded-lg w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-zinc-100">Kompres Item Terpilih (.zip)</h3>
              <button onClick={() => setShowZipModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">{selectedItems.length} item akan dikompres.</p>
            <input
              type="text"
              autoFocus
              value={zipNameValue}
              onChange={(e) => setZipNameValue(e.target.value)}
              placeholder="archive.zip"
              className="w-full bg-canvas-base border border-hairline rounded-md px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cobalt-600"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowZipModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleZipSelected}
                disabled={actionLoading || !zipNameValue.trim()}
                className="px-3 py-1.5 text-xs bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-md disabled:opacity-50"
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
