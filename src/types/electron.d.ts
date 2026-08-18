/**
 * Type declarations for the Electron preload bridge (contextBridge).
 * These APIs are exposed on window.electronAPI in the renderer process.
 */

import type { AppConfig, HistoryItem, ChatMessage, SpeechAnalysis } from './config';

// Mirrors electron/context-capture.ts CapturedContext (subset used by renderer)
interface CapturedContext {
  appName?: string;
  windowTitle?: string;
  bundleId?: string;
  url?: string;
  selectedText?: string;
  fieldText?: string;
  fieldRole?: string;
  fieldRoleDescription?: string;
  fieldLabel?: string;
  fieldPlaceholder?: string;
  cursorPosition?: number;
  selectionRange?: { location: number; length: number };
  numberOfCharacters?: number;
  insertionLineNumber?: number;
  clipboardText?: string;
  recentTranscriptions?: string[];
  screenContext?: string;
  screenshotDataUrl?: string;
  ocrDurationMs?: number;
}

export interface PipelineResult {
  success: boolean;
  rawText: string;
  processedText: string;
  skipped?: boolean;
  error?: string;
  systemPrompt?: string;
  sttModel?: string;
  llmModel?: string;
  sttDurationMs?: number;
  llmDurationMs?: number;
}

export interface APITestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ElectronAPI {
  // ─── Platform (sync) ────────────────────────────────────
  platform: string;

  // ─── Config ──────────────────────────────────────────
  getConfig: <K extends keyof AppConfig>(key: K) => Promise<AppConfig[K]>;
  setConfig: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => Promise<boolean>;
  getAllConfig: () => Promise<AppConfig>;

  // ─── Media Files ────────────────────────────────────
  saveMedia: (filename: string, base64: string) => Promise<string>;
  readMedia: (filePath: string) => Promise<string | null>;
  deleteMedia: (filePath: string) => Promise<boolean>;

  // ─── Microphone Permission ──────────────────────────
  checkMicPermission: () => Promise<string>;
  requestMicPermission: () => Promise<boolean>;

  // ─── Shortcuts ─────────────────────────────────────
  reregisterShortcuts: () => Promise<boolean>;
  suspendShortcuts: () => Promise<boolean>;
  resumeShortcuts: () => Promise<boolean>;

  // ─── Whisper Model Management ──────────────────────
  whisperIsDownloaded: () => Promise<boolean>;
  whisperIsDownloading: () => Promise<boolean>;
  whisperModelSize: () => Promise<number>;
  whisperIsBinaryAvailable: () => Promise<boolean>;
  whisperStartDownload: () => Promise<{ success: boolean; error?: string }>;
  whisperCancelDownload: () => Promise<boolean>;

  // ─── STT ───────────────────────────────────────────
  transcribe: (audioBuffer: ArrayBuffer, options?: { language?: string }) => Promise<{
    success: boolean;
    text?: string;
    error?: string;
  }>;

  // ─── LLM ──────────────────────────────────────────
  processText: (rawText: string, context?: Partial<CapturedContext>) => Promise<{
    success: boolean;
    text?: string;
    error?: string;
  }>;

  // ─── Speech Analysis ──────────────────────────
  analyzeSpeech: (params: {
    rawText: string;
    processedText: string;
    durationMs: number;
  }) => Promise<{ success: boolean; data?: SpeechAnalysis | null; error?: string }>;

  // ─── Full Pipeline ───────────────────────────────
  processPipeline: (audioBuffer: ArrayBuffer) => Promise<PipelineResult>;

  // ─── Voice Superpowers ────────────────────────────
  rewriteText: (selectedText: string, instruction: string) => Promise<{
    success: boolean;
    text?: string;
    error?: string;
  }>;

  // ─── Clipboard ─────────────────────────────────────
  writeClipboard: (text: string) => Promise<boolean>;

  // ─── Type at cursor ──────────────────────────────
  typeAtCursor: (text: string) => Promise<{ success: boolean; error?: string }>;

  // ─── Window controls ────────────────────────────
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  hideOverlay: () => Promise<void>;
  resizeOverlay: (w: number, h: number) => Promise<void>;

  // ─── Connection testing ────────────────────────────
  testGroqConnection: () => Promise<APITestResult>;
  testSTTConnection: () => Promise<{ success: boolean; text?: string; error?: string }>;

  // ─── Auto Updater ──────────────────────────────────
  checkForUpdates: () => Promise<unknown>;
  downloadUpdate: () => Promise<unknown>;
  installUpdate: () => Promise<void>;
  getVersion: () => Promise<string>;
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string }) => void) => () => void;
  onUpdateNotAvailable: (callback: () => void) => () => void;
  onDownloadProgress: (callback: (progress: { percent: number }) => void) => () => void;
  onUpdateDownloaded: (callback: () => void) => () => void;
  onUpdateError: (callback: (message: string) => void) => () => void;

  // ─── Chat ────────────────────────────────────────────
  sendChatMessage: (message: string, history: Array<{ role: string; content: string }>) => Promise<{ success: boolean; response?: string; error?: string }>;
  saveChatMessages: (messages: ChatMessage[]) => Promise<{ success: boolean; error?: string }>;
  loadChatMessages: () => Promise<ChatMessage[]>;

  // ─── Shell ───────────────────────────────────────────
  showItemInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;

  // ─── Context Awareness ───────────────────────────
  getLastContext: () => Promise<CapturedContext>;
  checkAccessibility: () => Promise<string>;
  requestAccessibility: () => Promise<boolean>;

  // ─── Whisper download progress events ────────────
  onWhisperDownloadProgress: (callback: (percent: number) => void) => () => void;

  // ─── Pipeline streaming events ────────────────────
  onSttDelta: (callback: (data: { delta: string; accumulated: string }) => void) => () => void;
  onPipelinePhase: (callback: (phase: string) => void) => () => void;

  // ─── Events from main process ─────────────────────
  onToggleRecording: (callback: () => void) => () => void;
  onNavigate: (callback: (page: string) => void) => () => void;
  onDictionaryAutoAdded: (callback: (words: string[]) => void) => () => void;
  onKnowledgeGraphUpdated: (callback: (nodes: unknown[]) => void) => () => void;
  onFnKeyEvent: (callback: (event: string) => void) => () => void;
  onHistoryUpdated: (callback: (history: HistoryItem[]) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
