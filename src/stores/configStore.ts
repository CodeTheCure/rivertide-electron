import { create } from 'zustand';
import { AppConfig, DEFAULT_CONFIG, DictionaryEntry, HistoryItem, KnowledgeNode, ChatMessage } from '../types/config';

interface ConfigStore {
  config: AppConfig;
  loaded: boolean;

  /** Load config from Electron or localStorage */
  load: () => Promise<void>;

  /** Set a single config key */
  set: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;

  /** Batch update multiple keys */
  update: (partial: Partial<AppConfig>) => void;

  /** Add a history item and update stats */
  addHistoryItem: (item: HistoryItem) => void;

  /** Clear all history */
  clearHistory: () => void;

  /** Delete a single history item */
  deleteHistoryItem: (id: string) => void;

  /** Update fields of an existing history item in-place */
  updateHistoryItem: (id: string, updates: Partial<HistoryItem>) => void;

  /** Add a word to personal dictionary */
  addDictionaryWord: (word: string, source?: DictionaryEntry['source']) => void;

  /** Remove a word from personal dictionary */
  removeDictionaryWord: (word: string) => void;

  /** Add a knowledge graph node */
  addKnowledgeNode: (node: { label: string; content: string; category: string; source?: KnowledgeNode['source'] }) => void;

  /** Update a knowledge graph node */
  updateKnowledgeNode: (id: string, updates: Partial<Pick<KnowledgeNode, 'label' | 'content' | 'category'>>) => void;

  /** Remove a knowledge graph node */
  removeKnowledgeNode: (id: string) => void;

  /** Save chat messages to persistent storage */
  saveChatMessages: (messages: ChatMessage[]) => void;

  /** Load chat messages from persistent storage */
  loadChatMessages: () => Promise<ChatMessage[]>;
}

function persist(key: string, value: any) {
  if (window.electronAPI) {
    window.electronAPI.setConfig(key as keyof AppConfig, value);
  } else {
    const stored = localStorage.getItem('rivertide-config');
    const obj = stored ? JSON.parse(stored) : {};
    obj[key] = value;
    localStorage.setItem('rivertide-config', JSON.stringify(obj));
  }
}

// Track listener cleanup functions to prevent double-registration
let ipcCleanups: (() => void)[] = [];

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  loaded: false,

  load: async () => {
    // Clean up previous listeners (prevents double-register on re-load)
    ipcCleanups.forEach(fn => fn());
    ipcCleanups = [];

    try {
      let stored: Partial<AppConfig> = {};
      if (window.electronAPI) {
        stored = await window.electronAPI.getAllConfig();
      } else {
        const raw = localStorage.getItem('rivertide-config');
        if (raw) stored = JSON.parse(raw);
      }
      set({ config: { ...DEFAULT_CONFIG, ...stored }, loaded: true });

      // Listen for cross-window history sync
      if (window.electronAPI?.onHistoryUpdated) {
        ipcCleanups.push(
          window.electronAPI.onHistoryUpdated((history) => {
            set((state) => ({ config: { ...state.config, history } }));
          }),
        );
      }

      // Listen for auto-learned dictionary terms from main process
      if (window.electronAPI?.onDictionaryAutoAdded) {
        ipcCleanups.push(
          window.electronAPI.onDictionaryAutoAdded(async () => {
            const dict = await window.electronAPI!.getConfig('personalDictionary');
            if (Array.isArray(dict)) {
              set((state) => ({ config: { ...state.config, personalDictionary: dict } }));
            }
          }),
        );
      }

      // Listen for auto-extracted knowledge graph nodes from main process
      if (window.electronAPI?.onKnowledgeGraphUpdated) {
        ipcCleanups.push(
          window.electronAPI.onKnowledgeGraphUpdated(async () => {
            const kg = await window.electronAPI!.getConfig('knowledgeGraph');
            if (Array.isArray(kg)) {
              set((state) => ({ config: { ...state.config, knowledgeGraph: kg } }));
            }
          }),
        );
      }
    } catch (e) {
      console.error('[ConfigStore] load failed:', e);
      set({ loaded: true });
    }
  },

  set: (key, value) => {
    set((state) => {
      persist(key as string, value);
      return { config: { ...state.config, [key]: value } };
    });
  },

  update: (partial) => {
    set((state) => {
      Object.entries(partial).forEach(([k, v]) => persist(k, v));
      return { config: { ...state.config, ...partial } };
    });
  },

  addHistoryItem: (item) => {
    set((state) => {
      if (!state.config.historyEnabled) return state;
      let history = [item, ...state.config.history].slice(0, 500);
      // Apply retention policy
      const retention = state.config.historyRetention;
      if (retention !== 'forever') {
        const ms: Record<string, number> = { '1h': 3600e3, '24h': 86400e3, '7d': 604800e3, '30d': 2592000e3 };
        const cutoff = Date.now() - (ms[retention] ?? Infinity);
        history = history.filter(h => h.timestamp >= cutoff);
      }
      persist('history', history);
      return { config: { ...state.config, history } };
    });
  },

  clearHistory: () => {
    set((state) => {
      persist('history', []);
      return { config: { ...state.config, history: [] } };
    });
  },

  deleteHistoryItem: (id: string) => {
    set((state) => {
      const history = state.config.history.filter((h) => h.id !== id);
      persist('history', history);
      return { config: { ...state.config, history } };
    });
  },

  updateHistoryItem: (id: string, updates: Partial<HistoryItem>) => {
    set((state) => {
      const history = state.config.history.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      persist('history', history);
      return { config: { ...state.config, history } };
    });
  },

  addDictionaryWord: (word: string, source: DictionaryEntry['source'] = 'manual') => {
    set((state) => {
      const trimmed = word.trim();
      if (!trimmed || state.config.personalDictionary.some((e) => e.word.toLowerCase() === trimmed.toLowerCase())) return state;
      const entry: DictionaryEntry = { word: trimmed, source, addedAt: Date.now() };
      let dict = [...state.config.personalDictionary, entry];
      // Cap dictionary at 2000 entries — evict oldest auto-learned words first
      if (dict.length > 2000) {
        const manual = dict.filter(e => e.source === 'manual');
        const auto = dict.filter(e => e.source !== 'manual').sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0));
        dict = [...manual, ...auto].slice(-2000);
      }
      persist('personalDictionary', dict);
      return { config: { ...state.config, personalDictionary: dict } };
    });
  },

  removeDictionaryWord: (word: string) => {
    set((state) => {
      const dict = state.config.personalDictionary.filter((e) => e.word !== word);
      persist('personalDictionary', dict);
      return { config: { ...state.config, personalDictionary: dict } };
    });
  },

  addKnowledgeNode: (node) => {
    set((state) => {
      const now = Date.now();
      const entry: KnowledgeNode = {
        id: now.toString(36) + Math.random().toString(36).slice(2, 6),
        ...node,
        source: node.source || 'manual',
        createdAt: now,
        updatedAt: now,
      };
      const kg = [...state.config.knowledgeGraph, entry];
      persist('knowledgeGraph', kg);
      return { config: { ...state.config, knowledgeGraph: kg } };
    });
  },

  updateKnowledgeNode: (id, updates) => {
    set((state) => {
      const kg = state.config.knowledgeGraph.map((node) =>
        node.id === id ? { ...node, ...updates, updatedAt: Date.now() } : node,
      );
      persist('knowledgeGraph', kg);
      return { config: { ...state.config, knowledgeGraph: kg } };
    });
  },

  removeKnowledgeNode: (id) => {
    set((state) => {
      const kg = state.config.knowledgeGraph.filter((node) => node.id !== id);
      persist('knowledgeGraph', kg);
      return { config: { ...state.config, knowledgeGraph: kg } };
    });
  },

  saveChatMessages: async (messages) => {
    if (window.electronAPI) {
      await window.electronAPI.saveChatMessages(messages);
    } else {
      localStorage.setItem('rivertide-chat-messages', JSON.stringify(messages));
    }
  },

  loadChatMessages: async () => {
    if (window.electronAPI) {
      return await window.electronAPI.loadChatMessages();
    }
    const raw = localStorage.getItem('rivertide-chat-messages');
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return [];
  },
}));
