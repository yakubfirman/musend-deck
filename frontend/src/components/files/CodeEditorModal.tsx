import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { php } from '@codemirror/lang-php';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { X, Save, Check, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface CodeEditorModalProps {
  filePath: string;
  onClose: () => void;
  onSaved?: () => void;
}

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({ filePath, onClose, onSaved }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

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

    api.readFile(filePath)
      .then((data) => {
        if (isMounted) {
          setContent(data.content);
          setLoading(false);
        }
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
  }, [filePath]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      await api.saveFile(filePath, content);
      setSaving(false);
      setSaveStatus('success');
      if (onSaved) onSaved();
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      setSaving(false);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Gagal menyimpan file');
    }
  }, [filePath, content, saving, onSaved]);

  // Handle Ctrl+S / Cmd+S and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="glass-card rounded-2xl border border-white/10 w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-zinc-950/80">
          <div className="flex items-center gap-2.5 overflow-hidden mr-4">
            <span className="font-mono text-xs text-cobalt-400 bg-cobalt-500/10 px-2.5 py-1 rounded-lg border border-cobalt-500/20 font-semibold">
              .{ext || 'txt'}
            </span>
            <span className="font-mono text-xs sm:text-sm text-zinc-100 font-semibold truncate" title={filePath}>
              {filePath}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
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
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-semibold bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-cobalt-600/20 interactive-tap transition-all"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan (Ctrl+S)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl interactive-tap transition-colors"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

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
                onChange={(val) => setContent(val)}
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
      </div>
    </div>
  );
};
