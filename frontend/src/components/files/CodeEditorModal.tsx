import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { php } from '@codemirror/lang-php';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { X, Save, Check, AlertCircle, Loader2, RotateCcw, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';

interface CodeEditorModalProps {
  filePath: string;
  onClose: () => void;
  onSaved?: () => void;
}

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({ filePath, onClose, onSaved }) => {
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>('');
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const draftStorageKey = useMemo(() => {
    return 'musend_draft_' + encodeURIComponent(filePath);
  }, [filePath]);

  const isDirty = useMemo(() => {
    return content !== originalContent && !loading;
  }, [content, originalContent, loading]);

  const ext = useMemo(() => {
    return filePath.split('.').pop()?.toLowerCase() || '';
  }, [filePath]);

  const extensions = useMemo(() => {
    const list = [oneDark];
    if (ext === 'php') list.push(php());
    else if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) list.push(javascript({ jsx: true, typescript: true }));
    else if (['html', 'htm'].includes(ext)) list.push(html());
    else if (['css', 'scss'].includes(ext)) list.push(css());
    else if (['json'].includes(ext)) list.push(json());
    return list;
  }, [ext]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMessage('');
    setHasDraft(false);

    api.readFile(filePath)
      .then((data) => {
        if (!isMounted) return;
        const serverCode = data.content;
        setOriginalContent(serverCode);

        // Check if there is an unsaved draft in localStorage
        try {
          const cachedDraft = localStorage.getItem(draftStorageKey);
          if (cachedDraft && cachedDraft !== serverCode) {
            setHasDraft(true);
            setDraftContent(cachedDraft);
            setContent(serverCode); // Show server version first with option to restore
          } else {
            setContent(serverCode);
          }
        } catch {
          setContent(serverCode);
        }

        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err.message || 'Gagal memuat isi file');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [filePath, draftStorageKey]);

  // Handle draft auto-saving when content changes
  const handleContentChange = useCallback((newVal: string) => {
    setContent(newVal);
    if (newVal !== originalContent) {
      try {
        localStorage.setItem(draftStorageKey, newVal);
      } catch {
        // Ignore localStorage quota exceeded
      }
    } else {
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {}
    }
  }, [originalContent, draftStorageKey]);

  const restoreDraft = useCallback(() => {
    if (draftContent) {
      setContent(draftContent);
      setHasDraft(false);
    }
  }, [draftContent]);

  const discardDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {}
    setHasDraft(false);
    setDraftContent('');
  }, [draftStorageKey]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      await api.saveFile(filePath, content);
      setSaving(false);
      setSaveStatus('success');
      setOriginalContent(content);
      // Clean up local draft since file is committed to server
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {}
      setHasDraft(false);

      if (onSaved) onSaved();
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      setSaving(false);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Gagal menyimpan file');
    }
  }, [filePath, content, saving, onSaved, draftStorageKey]);

  const handleAttemptClose = useCallback(() => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // Handle Ctrl+S / Cmd+S and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        if (showExitConfirm) {
          setShowExitConfirm(false);
        } else {
          handleAttemptClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleAttemptClose, showExitConfirm]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/80">
          <div className="flex items-center gap-2.5 overflow-hidden mr-4">
            <span className="font-mono text-xs text-cobalt-600 dark:text-cobalt-400 bg-cobalt-500/10 px-2.5 py-1 rounded-lg border border-cobalt-500/20 font-semibold">
              .{ext || 'txt'}
            </span>
            <span className="font-mono text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 font-semibold truncate" title={filePath}>
              {filePath}
            </span>
            {isDirty && (
              <span className="hidden sm:inline-flex items-center text-[10px] font-mono text-status-amber bg-status-amber/10 border border-status-amber/25 px-2 py-0.5 rounded-md">
                • Draf disimpan lokal
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {saveStatus === 'success' && (
              <span className="flex items-center gap-1.5 text-xs text-status-emerald font-mono bg-status-emerald/10 border border-status-emerald/20 px-2.5 py-1 rounded-lg animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Tersimpan
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs text-status-rose font-mono bg-status-rose/10 border border-status-rose/20 px-2.5 py-1 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5" /> Gagal
              </span>
            )}

            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 text-xs font-mono font-semibold bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-cobalt-600/20 interactive-tap transition-all"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Simpan (Ctrl+S)</span>
              <span className="sm:hidden">Simpan</span>
            </button>

            <button
              onClick={handleAttemptClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl interactive-tap transition-colors"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Draft Recovery Notification Banner */}
        {hasDraft && (
          <div className="px-4 py-2.5 bg-status-amber/10 border-b border-status-amber/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono animate-in fade-in">
            <div className="flex items-center gap-2 text-status-amber">
              <RotateCcw className="w-4 h-4 flex-shrink-0" />
              <span>Ditemukan draf belum tersimpan di browser ini yang berbeda dari versi server.</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={restoreDraft}
                className="px-2.5 py-1 bg-status-amber text-black font-semibold rounded-lg hover:bg-status-amber/90 transition-all text-[11px]"
              >
                Pulihkan Draf
              </button>
              <button
                onClick={discardDraft}
                className="px-2.5 py-1 bg-black/20 text-zinc-300 hover:text-white rounded-lg transition-colors text-[11px]"
              >
                Abaikan
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden relative bg-[#282c34]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-cobalt-500" />
              <span className="text-xs font-mono">Membaca file...</span>
            </div>
          ) : errorMessage ? (
            <div className="p-6 text-status-rose text-sm font-mono flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <CodeMirror
                value={content}
                height="100%"
                extensions={extensions}
                theme={oneDark}
                onChange={handleContentChange}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightSpecialChars: true,
                  history: true,
                  foldGutter: true,
                  drawSelection: true,
                  dropCursor: true,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  syntaxHighlighting: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  rectangularSelection: true,
                  crosshairCursor: true,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                  closeBracketsKeymap: true,
                  defaultKeymap: true,
                  searchKeymap: true,
                  historyKeymap: true,
                  foldKeymap: true,
                  completionKeymap: true,
                  lintKeymap: true,
                }}
              />
            </div>
          )}
        </div>

        {/* Unsaved Changes Confirmation Modal */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100">
            <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-5 space-y-3.5 shadow-2xl">
              <div className="flex items-center gap-2.5 text-status-amber pb-2 border-b border-slate-200 dark:border-white/10">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <h4 className="text-sm font-bold">Perubahan Belum Disimpan</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 font-mono leading-relaxed">
                File ini memiliki modifikasi yang belum dikirim ke server. Draf perubahan Anda tetap tersimpan otomatis di browser ini.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="px-3.5 py-1.5 text-xs font-mono text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-colors"
                >
                  Lanjut Mengedit
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 text-xs font-mono font-semibold bg-status-rose hover:bg-status-rose/80 text-white rounded-xl transition-all"
                >
                  Tutup Editor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
