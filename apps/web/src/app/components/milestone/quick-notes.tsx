import React, { useState, useEffect } from 'react';
import { FaStickyNote, FaPlus, FaTrash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @description
 * Quick Notes component that allows users to create, edit, and manage personal notes
 * related to their plan. Notes are persisted in localStorage for now.
 *
 * @receives data from:
 * - None: Independent component with local state management
 *
 * @sends data to:
 * - localStorage: Persists notes data
 *
 * @sideEffects:
 * - Reads from and writes to localStorage
 */
const QuickNotes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Load notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('milestoneAI_notes');
    if (savedNotes) {
      try {
        const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt)
        }));
        setNotes(parsedNotes);
      } catch (error) {
        console.error('Error loading notes from localStorage:', error);
      }
    }
  }, []);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    localStorage.setItem('milestoneAI_notes', JSON.stringify(notes));
  }, [notes]);

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const handleAddNote = () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    const newNote: Note = {
      id: generateId(),
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setNotes(prev => [newNote, ...prev]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsAddingNote(false);
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    setNotes(prev => prev.map(note =>
      note.id === editingNoteId
        ? { ...note, title: editTitle.trim(), content: editContent.trim(), updatedAt: new Date() }
        : note
    ));

    setEditingNoteId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <article className="group relative overflow-hidden rounded-lg border transition-shadow motion-reduce:transition-none" style={{
      background: 'radial-gradient(360px 200px at 50% 0%, rgba(34,211,238,0.22), rgba(0,0,0,0) 70%), var(--surface-card)',
      borderColor: 'var(--border-subtle)',
    }}>
      <div className="p-6 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaStickyNote className="text-[var(--accent-cyan,#22D3EE)]" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-inverse)' }}>
              Quick Notes
            </h2>
          </div>
          <button
            onClick={() => setIsAddingNote(true)}
            className="flex items-center space-x-2 px-3 py-2 text-white rounded-lg text-sm font-medium shadow-md transition-colors motion-reduce:transition-none"
            style={{
              backgroundColor: 'var(--black)',
              backgroundImage: 'var(--grad-cta), linear-gradient(var(--black), var(--black))',
              backgroundRepeat: 'no-repeat, no-repeat',
              backgroundSize: 'calc(100% - 12px) 1px, 100% 100%',
              backgroundPosition: 'center 100%, 0 0',
              border: 'none',
            }}
          >
            <FaPlus className="text-xs text-[var(--accent-cyan,#22D3EE)]" />
            <span>Add Note</span>
          </button>
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Jot down ideas, reminders, and insights
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {/* Add Note Form */}
        {isAddingNote && (
          <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-deep)]">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Note title..."
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--accent-cyan,#22D3EE)]"
                autoFocus
              />
              <textarea
                placeholder="Write your note..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--accent-cyan,#22D3EE)] resize-none"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleAddNote}
                  className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg text-sm font-medium shadow-md transition-colors motion-reduce:transition-none"
                  style={{
                    backgroundColor: 'var(--black)',
                    backgroundImage: 'var(--grad-cta), linear-gradient(var(--black), var(--black))',
                    backgroundRepeat: 'no-repeat, no-repeat',
                    backgroundSize: 'calc(100% - 12px) 1px, 100% 100%',
                    backgroundPosition: 'center 100%, 0 0',
                    border: 'none',
                  }}
                >
                  <FaSave className="text-xs text-white" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => {
                    setIsAddingNote(false);
                    setNewNoteTitle('');
                    setNewNoteContent('');
                  }}
                  className="flex items-center space-x-2 px-4 py-2 border border-[var(--border-subtle)] text-[var(--text-muted)] rounded-lg hover:bg-[var(--neutral-950)] transition-colors text-sm font-medium"
                >
                  <FaTimes className="text-xs text-[var(--accent-cyan,#22D3EE)]" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="p-6">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <FaStickyNote className="text-4xl mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No notes yet</p>
              <p className="text-sm">Add your first note to capture ideas and insights</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--bg-deep)]">
                  {editingNoteId === note.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--accent-cyan,#22D3EE)] font-medium"
                        autoFocus
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--accent-cyan,#22D3EE)] resize-none"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center space-x-2 px-3 py-2 text-white rounded-lg text-sm font-medium shadow-md transition-colors motion-reduce:transition-none"
                          style={{
                            backgroundColor: 'var(--black)',
                            backgroundImage: 'var(--grad-cta), linear-gradient(var(--black), var(--black))',
                            backgroundRepeat: 'no-repeat, no-repeat',
                            backgroundSize: 'calc(100% - 12px) 1px, 100% 100%',
                            backgroundPosition: 'center 100%, 0 0',
                            border: 'none',
                          }}
                        >
                          <FaSave className="text-xs text-white" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center space-x-2 px-3 py-2 border border-[var(--border-subtle)] text-[var(--text-muted)] rounded-lg hover:bg-[var(--neutral-950)] transition-colors text-sm font-medium"
                        >
                          <FaTimes className="text-xs text-[var(--accent-cyan,#22D3EE)]" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-medium text-[var(--text-inverse)] pr-2">
                          {note.title}
                        </h3>
                        <div className="flex space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-cyan,#22D3EE)] transition-colors"
                          title="Edit note"
                        >
                          <FaEdit className="text-sm text-[var(--accent-cyan,#22D3EE)]" />
                        </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                            title="Delete note"
                          >
                            <FaTrash className="text-sm text-[var(--accent-cyan,#22D3EE)]" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[var(--text-inverse)] leading-relaxed mb-3 whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <div className="text-xs text-[var(--text-muted)]">
                        {note.createdAt.getTime() === note.updatedAt.getTime()
                          ? `Created ${formatDate(note.createdAt)}`
                          : `Updated ${formatDate(note.updatedAt)}`
                        }
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default QuickNotes;
