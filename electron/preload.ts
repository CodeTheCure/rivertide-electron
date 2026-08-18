import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform (sync)
  platform: process.platform,

  // Config
  getConfig: (key: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  getAllConfig: () => ipcRenderer.invoke('config:getAll'),

  // Media files
  saveMedia: (filename: string, base64: string) => ipcRenderer.invoke('media:save', filename, base64),
  readMedia: (filePath: string) => ipcRenderer.invoke('media:read', filePath),
  deleteMedia: (filePath: string) => ipcRenderer.invoke('media:delete', filePath),

  // Microphone permission
  checkMicPermission: () => ipcRenderer.invoke('mic:checkPermission'),
  requestMicPermission: () => ipcRenderer.invoke('mic:requestPermission'),

  // Shortcuts
  reregisterShortcuts: () => ipcRenderer.invoke('shortcuts:reregister'),
  suspendShortcuts: () => ipcRenderer.invoke('shortcuts:suspend'),
  resumeShortcuts: () => ipcRenderer.invoke('shortcuts:resume'),

  // Whisper model management
  whisperIsDownloaded: () => ipcRenderer.invoke('whisper:isDownloaded'),
  whisperIsDownloading: () => ipcRenderer.invoke('whisper:isDownloading'),
  whisperModelSize: () => ipcRenderer.invoke('whisper:modelSize'),
  whisperIsBinaryAvailable: () => ipcRenderer.invoke('whisper:isBinaryAvailable'),
  whisperStartDownload: () => ipcRenderer.invoke('whisper:startDownload'),
  whisperCancelDownload: () => ipcRenderer.invoke('whisper:cancelDownload'),

  // STT
  transcribe: (buf: ArrayBuffer, opts?: { language?: string }) => ipcRenderer.invoke('stt:transcribe', buf, opts),

  // LLM
  processText: (text: string, ctx?: any) => ipcRenderer.invoke('llm:process', text, ctx),

  // Speech Analysis
  analyzeSpeech: (params: { rawText: string; processedText: string; durationMs: number }) => ipcRenderer.invoke('analysis:analyze', params),

  // Full pipeline
  processPipeline: (buf: ArrayBuffer) => ipcRenderer.invoke('pipeline:process', buf),

  // Voice Superpowers
  rewriteText: (text: string, instruction: string) => ipcRenderer.invoke('llm:rewrite', text, instruction),

  // Clipboard
  writeClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),

  // Type at cursor
  typeAtCursor: (text: string) => ipcRenderer.invoke('text:typeAtCursor', text),

  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  hideOverlay: () => ipcRenderer.invoke('window:hideOverlay'),
  resizeOverlay: (w: number, h: number) => ipcRenderer.invoke('window:resizeOverlay', w, h),

  // Groq API test
  testGroqConnection: () => ipcRenderer.invoke('groq:testConnection'),

  // STT test
  testSTTConnection: () => ipcRenderer.invoke('stt:testConnection'),

  // Auto updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  getVersion: () => ipcRenderer.invoke('updater:getVersion'),

  onUpdateAvailable: (cb: (info: { version: string; releaseNotes?: string }) => void) => {
    ipcRenderer.on('updater:update-available', (_e, info) => cb(info));
    return () => { ipcRenderer.removeAllListeners('updater:update-available'); };
  },
  onUpdateNotAvailable: (cb: () => void) => {
    ipcRenderer.on('updater:update-not-available', () => cb());
    return () => { ipcRenderer.removeAllListeners('updater:update-not-available'); };
  },
  onDownloadProgress: (cb: (progress: { percent: number }) => void) => {
    ipcRenderer.on('updater:download-progress', (_e, progress) => cb(progress));
    return () => { ipcRenderer.removeAllListeners('updater:download-progress'); };
  },
  onUpdateDownloaded: (cb: () => void) => {
    ipcRenderer.on('updater:update-downloaded', () => cb());
    return () => { ipcRenderer.removeAllListeners('updater:update-downloaded'); };
  },
  onUpdateError: (cb: (msg: string) => void) => {
    ipcRenderer.on('updater:error', (_e, msg) => cb(msg));
    return () => { ipcRenderer.removeAllListeners('updater:error'); };
  },

  // Chat
  sendChatMessage: (message: string, history: Array<{ role: string; content: string }>) => ipcRenderer.invoke('chat:send', message, history),
  saveChatMessages: (messages: Array<unknown>) => ipcRenderer.invoke('chat:history:save', messages),
  loadChatMessages: () => ipcRenderer.invoke('chat:history:load'),

  // Shell
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),

  // Context awareness
  getLastContext: () => ipcRenderer.invoke('context:getLastContext'),
  checkAccessibility: () => ipcRenderer.invoke('context:checkAccessibility'),
  requestAccessibility: () => ipcRenderer.invoke('context:requestAccessibility'),

  // Whisper download progress events
  onWhisperDownloadProgress: (cb: (percent: number) => void) => {
    ipcRenderer.on('whisper:download-progress', (_e, percent) => cb(percent));
    return () => { ipcRenderer.removeAllListeners('whisper:download-progress'); };
  },

  // Pipeline streaming events
  onSttDelta: (cb: (data: { delta: string; accumulated: string }) => void) => {
    ipcRenderer.on('pipeline:stt-delta', (_e, data) => cb(data));
    return () => { ipcRenderer.removeAllListeners('pipeline:stt-delta'); };
  },
  onPipelinePhase: (cb: (phase: string) => void) => {
    ipcRenderer.on('pipeline:phase', (_e, phase) => cb(phase));
    return () => { ipcRenderer.removeAllListeners('pipeline:phase'); };
  },

  // Events
  onToggleRecording: (cb: () => void) => {
    ipcRenderer.on('toggle-recording', () => cb());
    return () => { ipcRenderer.removeAllListeners('toggle-recording'); };
  },
  onNavigate: (cb: (page: string) => void) => {
    ipcRenderer.on('navigate', (_e, page) => cb(page));
    return () => { ipcRenderer.removeAllListeners('navigate'); };
  },
  onDictionaryAutoAdded: (cb: (words: string[]) => void) => {
    ipcRenderer.on('dictionary:auto-added', (_e, words) => cb(words));
    return () => { ipcRenderer.removeAllListeners('dictionary:auto-added'); };
  },
  onKnowledgeGraphUpdated: (cb: (nodes: unknown[]) => void) => {
    ipcRenderer.on('knowledgeGraph:auto-added', (_e, nodes) => cb(nodes));
    return () => { ipcRenderer.removeAllListeners('knowledgeGraph:auto-added'); };
  },
  onFnKeyEvent: (cb: (event: string) => void) => {
    ipcRenderer.on('fn-key-event', (_e, event) => cb(event));
    return () => { ipcRenderer.removeAllListeners('fn-key-event'); };
  },
  onHistoryUpdated: (cb: (history: any[]) => void) => {
    ipcRenderer.on('config:history-updated', (_e, history) => cb(history));
    return () => { ipcRenderer.removeAllListeners('config:history-updated'); };
  },
});
