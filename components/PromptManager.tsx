
import React, { useState, useEffect } from 'react';
import { SavedPrompt, ThemeColor } from '../types';
import { Save, FolderOpen, Trash2, X, Check, Loader2, Pencil } from 'lucide-react';
import { savePromptsToServer, loadPromptsFromServer } from '../services/comfyService';

interface PromptManagerProps {
  currentPrompt: string;
  serverAddress: string;
  onLoadPrompt: (text: string) => void;
  theme: ThemeColor;
  workflow: string;
}

const PromptManager: React.FC<PromptManagerProps> = ({ currentPrompt, serverAddress, onLoadPrompt, theme, workflow }) => {
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'list' | 'save'>('list');
  const [newPromptName, setNewPromptName] = useState('');
  const [promptText, setPromptText] = useState(''); // Text for saving/editing
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load prompts when modal opens or server address changes
  useEffect(() => {
    if (showModal && serverAddress) {
      loadPrompts();
    }
  }, [showModal, serverAddress]);

  // Init text when entering save mode
  useEffect(() => {
    if (mode === 'save' && !editingPrompt) {
      setPromptText(currentPrompt);
    }
  }, [mode, editingPrompt, currentPrompt]);

  const loadPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompts = await loadPromptsFromServer(serverAddress);
      setSavedPrompts(prompts);
    } catch (err) {
      setError("Failed to load prompts from server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newPromptName.trim() || !promptText.trim()) return;

    setLoading(true);

    let updated: SavedPrompt[];

    if (editingPrompt) {
      // Update existing
      const updatedPrompt: SavedPrompt = {
        ...editingPrompt,
        name: newPromptName.trim(),
        text: promptText,
        timestamp: Date.now()
      };
      updated = savedPrompts.map(p => p.id === editingPrompt.id ? updatedPrompt : p);
    } else {
      // Create new
      const newPrompt: SavedPrompt = {
        id: Date.now().toString(),
        name: newPromptName.trim(),
        text: promptText,
        timestamp: Date.now(),
        workflow: workflow
      };
      updated = [newPrompt, ...savedPrompts];
    }

    try {
      await savePromptsToServer(updated, serverAddress);
      setSavedPrompts(updated);
      setNewPromptName('');
      setPromptText('');
      setEditingPrompt(null);
      setMode('list');
    } catch (err) {
      setError("Failed to save prompt to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;

    setLoading(true);
    const updated = savedPrompts.filter(p => p.id !== id);

    try {
      await savePromptsToServer(updated, serverAddress);
      setSavedPrompts(updated);
    } catch (err) {
      setError("Failed to delete prompt.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (prompt: SavedPrompt) => {
    setEditingPrompt(prompt);
    setNewPromptName(prompt.name);
    setPromptText(prompt.text);
    setMode('save');
  };

  const handleLoad = (text: string) => {
    onLoadPrompt(text);
    setShowModal(false);
  };

  const openSaveMode = () => {
    setEditingPrompt(null);
    setNewPromptName('');
    // promptText initialized by effect
    setMode('save');
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => { openSaveMode(); setShowModal(true); }}
          className={`p-2 text-gray-400 dark:text-gray-500 hover:text-${theme}-600 dark:hover:text-${theme}-400 transition-colors`}
          title="Save Prompt"
        >
          <Save size={20} />
        </button>
        <button
          onClick={() => { setMode('list'); setShowModal(true); }}
          className={`p-2 text-gray-400 dark:text-gray-500 hover:text-${theme}-600 dark:hover:text-${theme}-400 transition-colors`}
          title="Load Prompt"
        >
          <FolderOpen size={20} />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-colors duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col max-h-[80vh]">

            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {mode === 'save' ? (editingPrompt ? 'Edit Prompt' : 'Save Prompt') : 'Saved Prompts'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 min-h-[200px]">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className={`animate-spin text-${theme}-500`} size={32} />
                </div>
              )}

              {!loading && error && (
                <div className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-3 rounded text-sm text-center">
                  {error}
                </div>
              )}

              {!loading && !error && (
                <>
                  {mode === 'save' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Prompt Name</label>
                        <input
                          type="text"
                          value={newPromptName}
                          onChange={(e) => setNewPromptName(e.target.value)}
                          placeholder="e.g., Red Dress"
                          className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-${theme}-500 outline-none`}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Prompt Text</label>
                        <textarea
                          value={promptText}
                          onChange={(e) => setPromptText(e.target.value)}
                          className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white min-h-[100px] text-sm focus:border-${theme}-500 outline-none resize-none`}
                        />
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={!newPromptName.trim() || !promptText.trim()}
                        className={`w-full bg-${theme}-600 hover:bg-${theme}-500 text-white py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {editingPrompt ? 'Update Prompt' : 'Save Prompt'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedPrompts.filter(p => (p.workflow || 'edit') === workflow).length === 0 ? (
                        <div className="text-center text-gray-500 py-8">No saved prompts found for this workflow.</div>
                      ) : (
                        savedPrompts
                          .filter(p => (p.workflow || 'edit') === workflow)
                          .map(prompt => (
                            <div key={prompt.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 group transition-all">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{prompt.name}</span>
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEdit(prompt)}
                                    className={`p-1 text-gray-400 hover:text-${theme}-500 dark:text-gray-500 dark:hover:text-${theme}-400 transition-colors`}
                                    title="Edit"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(prompt.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{prompt.text}</p>
                              <button
                                onClick={() => handleLoad(prompt.text)}
                                className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 py-1.5 rounded text-xs text-gray-800 dark:text-white transition-colors"
                              >
                                <Check size={14} /> Load
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {mode === 'list' && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
                <button
                  onClick={() => openSaveMode()}
                  className={`text-xs text-${theme}-600 dark:text-${theme}-400 hover:text-${theme}-500 dark:hover:text-${theme}-300 w-full text-center`}
                >
                  Switch to Save Mode
                </button>
              </div>
            )}
            {mode === 'save' && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
                <button
                  onClick={() => { setMode('list'); setError(null); }}
                  className={`text-xs text-${theme}-600 dark:text-${theme}-400 hover:text-${theme}-500 dark:hover:text-${theme}-300 w-full text-center`}
                >
                  Back to List
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PromptManager;