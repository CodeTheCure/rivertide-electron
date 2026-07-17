import { useState, useEffect, useRef, useCallback } from 'react';
import { useConfigStore } from '../stores/configStore';
import { useTranslation } from '../i18n';
import type { ChatMessage } from '../types/config';
import { PrivacyPolicy } from '../components/PrivacyPolicy';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function ChatPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const saveChatMessages = useConfigStore((s) => s.saveChatMessages);
  const loadChatMessages = useConfigStore((s) => s.loadChatMessages);

  // Load chat history on mount
  useEffect(() => {
    loadChatMessages().then((saved) => {
      if (saved.length > 0) setMessages(saved);
    });
  }, [loadChatMessages]);

  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0) saveChatMessages(messages);
  }, [messages, saveChatMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      let result: { success: boolean; response?: string; error?: string };

      // Use IPC if available, otherwise fallback
      if (window.electronAPI) {
        const history = updatedMessages.map((m) => ({ role: m.role, content: m.content }));
        result = await window.electronAPI.sendChatMessage(text, history.slice(0, -1));
      } else {
        await new Promise((r) => setTimeout(r, 1000));
        result = { success: true, response: 'Chat is available in the Electron app with Groq API.' };
      }

      if (result.success && result.response) {
        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: result.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const friendlyError = result?.error?.includes('401') || result?.error?.includes('API key')
          ? 'Authentication error: Please check your API key in Settings.'
          : result?.error?.includes('429')
          ? 'Too many requests: Please wait a moment and try again.'
          : result?.error?.includes('5')
          ? 'Service temporarily unavailable. Please try again later.'
          : result?.error || 'Something went wrong. Please try again.';

        const errorMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: friendlyError,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    saveChatMessages([]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-200 dark:border-surface-800/60">
        <h1 className="text-[17px] font-semibold text-surface-900 dark:text-surface-100">
          {t('chat.title')}
        </h1>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-xs text-surface-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            {t('common.clear')}
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-6 py-2 bg-amber-50/50 dark:bg-amber-500/5 border-b border-amber-200/30 dark:border-amber-500/10">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed flex items-start gap-2">
          <span className="shrink-0 mt-px">⚠</span>
          <span>
            AI can make mistakes. Your data is encrypted and private.{' '}
            <button
              onClick={() => setShowPrivacy(true)}
              className="underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-200"
            >
              Privacy Policy
            </button>
          </span>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-300 dark:text-brand-500/40 mb-3">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-sm text-surface-400 dark:text-surface-500">{t('chat.empty')}</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rt-chat-bubble-user'
                  : 'rt-chat-bubble-assistant'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rt-chat-bubble-assistant px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-surface-400 rt-dot-bounce" />
                <div className="w-2 h-2 rounded-full bg-surface-400 rt-dot-bounce" />
                <div className="w-2 h-2 rounded-full bg-surface-400 rt-dot-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-800/60">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            disabled={loading}
            className="rt-input flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 placeholder-surface-400 dark:placeholder-surface-500 border border-surface-200 dark:border-surface-700/60 text-sm disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {loading ? (
              <span>{t('chat.thinking')}</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                {t('chat.send')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowPrivacy(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-800 w-[560px] max-h-[75vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <PrivacyPolicy onClose={() => setShowPrivacy(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
