import { useState } from 'react';
import { useConfigStore } from '../stores/configStore';
import { useTranslation } from '../i18n';
import type { KnowledgeNode } from '../types/config';

const CATEGORIES = ['personal', 'work', 'tech', 'health', 'social', 'other'];

function NodeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: KnowledgeNode;
  onSave: (data: { label: string; content: string; category: string }) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'personal');

  return (
    <div className="rt-card p-5">
      <div>
        <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">{t('knowledgeGraph.label')}</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rt-input w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700/60 text-sm"
          placeholder={t('knowledgeGraph.labelPlaceholder')}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">{t('knowledgeGraph.content')}</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="rt-input w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700/60 text-sm resize-none"
          placeholder={t('knowledgeGraph.contentPlaceholder')}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">{t('knowledgeGraph.category')}</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400 hover:bg-surface-300 dark:hover:bg-surface-600'
              }`}
            >
              {t(`knowledgeGraph.cat_${cat}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ label, content, category })}
          disabled={!label.trim() || !content.trim()}
          className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('knowledgeGraph.save')}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-medium hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors"
        >
          {t('knowledgeGraph.cancel')}
        </button>
      </div>
    </div>
  );
}

export function KnowledgeGraphPage() {
  const { t } = useTranslation();
  const knowledgeGraph = useConfigStore((s) => s.config.knowledgeGraph);
  const addKnowledgeNode = useConfigStore((s) => s.addKnowledgeNode);
  const updateKnowledgeNode = useConfigStore((s) => s.updateKnowledgeNode);
  const removeKnowledgeNode = useConfigStore((s) => s.removeKnowledgeNode);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = knowledgeGraph.filter((node) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      node.label.toLowerCase().includes(q) ||
      node.content.toLowerCase().includes(q) ||
      node.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-200 dark:border-surface-800/60">
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-semibold text-surface-900 dark:text-surface-100 rt-text-glow">
            {t('knowledgeGraph.title')}
          </h1>
          <span className="text-xs text-surface-400 dark:text-surface-500 font-medium">
            {knowledgeGraph.length} item{knowledgeGraph.length !== 1 ? 's' : ''}
            {knowledgeGraph.length > 0 && (
              <>
                {' · '}
                {knowledgeGraph.filter(n => n.source === 'auto-llm').length} auto
                {' · '}
                {knowledgeGraph.filter(n => n.source === 'manual').length} manual
              </>
            )}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors"
        >
          {t('knowledgeGraph.add')}
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-surface-200 dark:border-surface-800/60">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('knowledgeGraph.search')}
          className="rt-input w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 placeholder-surface-400 dark:placeholder-surface-500 border border-surface-200 dark:border-surface-700/60 text-sm"
        />
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {/* Add form */}
        {showAdd && (
          <NodeForm
            onSave={(data) => {
              addKnowledgeNode(data);
              setShowAdd(false);
            }}
            onCancel={() => setShowAdd(false)}
          />
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-300 dark:text-brand-500/40 mb-3">
              <circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M2 12a10 10 0 0 1 10-10"/><path d="M2 12a10 10 0 0 0 10 10"/><path d="M12 22a10 10 0 0 0 10-10"/>
            </svg>
            <p className="text-sm text-surface-400 dark:text-surface-500">{t('knowledgeGraph.noNodes')}</p>
            <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">{t('knowledgeGraph.noNodesHint')}</p>
          </div>
        )}

        {filtered.map((node) => (
          <div
            key={node.id}
            className="rt-node-card overflow-hidden"
          >
            {editingId === node.id ? (
              <NodeForm
                initial={node}
                onSave={(data) => {
                  updateKnowledgeNode(node.id, data);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-surface-900 dark:text-surface-100 truncate">{node.label}</h3>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-400">
                        {t(`knowledgeGraph.cat_${node.category}`)}
                      </span>
                      {node.source === 'auto-llm' ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400">
                          {t('knowledgeGraph.autoExtracted')}
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {t('knowledgeGraph.manualAdded')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed whitespace-pre-wrap line-clamp-3">{node.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditingId(node.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                      title={t('knowledgeGraph.edit')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeletingId(node.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title={t('knowledgeGraph.delete')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {deletingId === node.id && (
                  <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700/60 flex items-center justify-between">
                    <span className="text-xs text-surface-500 dark:text-surface-400">{t('knowledgeGraph.confirmDelete')}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          removeKnowledgeNode(node.id);
                          setDeletingId(null);
                        }}
                        className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
                      >
                        {t('knowledgeGraph.delete')}
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-medium transition-colors"
                      >
                        {t('knowledgeGraph.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
