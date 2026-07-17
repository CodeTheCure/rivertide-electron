/**
 * Auto-dictionary learning module.
 * Handles all LLM-driven term extraction and dictionary persistence.
 */

import { state } from './app-state';
import { CapturedContext, execAsync } from './context-capture';
import { AppConfig, DictionaryEntry } from '../src/types/config';
import { shouldSkipExtraction, buildPipelinePrompt, buildEditDiffPrompt } from './auto-dict-utils';

// Re-export for external consumers
export { shouldSkipExtraction, buildPipelinePrompt, buildEditDiffPrompt } from './auto-dict-utils';

// ─── Dictionary persistence ────────────────────────────────────────────────

export function saveDictionaryTerms(terms: string[], source: DictionaryEntry['source']): string[] {
  if (!terms.length) return [];
  const dictEntries = state.configStore!.get('personalDictionary');
  const existingWords = new Set(dictEntries.map(e => e.word.toLowerCase()));
  const newTerms = terms.filter(t => !existingWords.has(t.toLowerCase()));
  if (!newTerms.length) return [];
  const newEntries = newTerms.map(w => ({ word: w, source, addedAt: Date.now() }));
  state.configStore!.set('personalDictionary', [...dictEntries, ...newEntries]);
  console.log(`[AutoDict:${source}] learned:`, newTerms);
  if (state.mainWindow && !state.mainWindow.isDestroyed()) {
    state.mainWindow.webContents.send('dictionary:auto-added', newTerms);
  }
  return newTerms;
}

function getDictWords(): string[] {
  return state.configStore!.get('personalDictionary').map(e => e.word);
}

// ─── Pipeline post-extraction (fire-and-forget) ────────────────────────────

export function schedulePostPipelineExtraction(raw: string, processed: string, cfg: AppConfig) {
  if (shouldSkipExtraction(raw, processed, cfg.autoLearnDictionary)) return;

  // Capture screenshot now (before setImmediate) — state.lastCapturedContext may be
  // overwritten by the next recording before the callback fires
  const screenshotDataUrl = state.lastCapturedContext?.screenshotDataUrl || null;

  setImmediate(() => {
    const dictWords = getDictWords();
    const prompt = buildPipelinePrompt(raw, processed, !!screenshotDataUrl, dictWords);

    state.llmService!.extractTermsWithImage(prompt, screenshotDataUrl, cfg, dictWords)
      .then(terms => saveDictionaryTerms(terms, 'auto-llm'))
      .catch(e => console.error('[AutoDict:auto-llm] error:', e.message));
  });
}

// ─── User edit detection ────────────────────────────────────────────────────

export interface EditDetectionParams {
  lastTypedText: string;
  lastCtx: { appName?: string; bundleId?: string; fieldRole?: string };
}

/** Snapshot state for edit detection. Must be called before context capture clears state. */
export function prepareEditDetection(cfg: AppConfig): EditDetectionParams | null {
  if (!state.lastTypedText || !state.lastTypedContext || !cfg.autoLearnDictionary || !cfg.contextL1Enabled) return null;

  const EDIT_DETECTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 min window for detecting user edits
  const timeSince = Date.now() - state.lastTypedAt;
  if (timeSince >= EDIT_DETECTION_TIMEOUT_MS) {
    state.lastTypedText = null;
    return null;
  }

  const params: EditDetectionParams = {
    lastTypedText: state.lastTypedText,
    lastCtx: state.lastTypedContext,
  };
  state.lastTypedText = null; // clear immediately to prevent re-trigger
  return params;
}

/** Run edit detection using an already-captured context (no extra osascript call). */
export function runEditDetection(params: EditDetectionParams, currentCtx: CapturedContext, cfg: AppConfig) {
  const { lastTypedText, lastCtx } = params;

  if (currentCtx.bundleId !== lastCtx.bundleId || currentCtx.fieldRole !== lastCtx.fieldRole) return;

  const currentFieldText = currentCtx.fieldText;
  if (!currentFieldText) return;
  if (currentFieldText.includes(lastTypedText)) return;
  const dictWords = getDictWords();
  const prompt = buildEditDiffPrompt(lastTypedText, currentFieldText, dictWords);
  state.llmService!.extractTerms(prompt, cfg, dictWords)
    .then(terms => saveDictionaryTerms(terms, 'auto-diff'))
    .catch(e => console.error('[AutoDict:diff]', e));
}

// ─── Record typed text for later edit detection ────────────────────────────

export function recordTypedText(text: string) {
  state.lastTypedText = text;
  state.lastTypedContext = {
    appName: state.lastCapturedContext?.appName,
    bundleId: state.lastCapturedContext?.bundleId,
    fieldRole: state.lastCapturedContext?.fieldRole,
  };
  state.lastTypedAt = Date.now();

  schedulePostPasteEditDetection(text);
}

// ─── 5-second post-paste edit detection ─────────────────────────────────────

function schedulePostPasteEditDetection(text: string) {
  const bundleId = state.lastTypedContext?.bundleId;
  const fieldRole = state.lastTypedContext?.fieldRole;

  setTimeout(async () => {
    try {
      const cfg = state.configStore!.getAll();
      if (!cfg.autoLearnDictionary || !cfg.contextL1Enabled) return;

      const result = await execAsync(`osascript -e '
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set currentBid to bundle identifier of frontApp
          set focusedField to focused of text area 1 of window 1 of frontApp
          if focusedField exists then
            try
              set currentRole to role of focusedField
              set fieldVal to value of attribute "AXValue" of focusedField
              return currentBid & "|||" & currentRole & "|||" & fieldVal
            end try
          end if
        end tell
        return ""
      '`, { timeout: 3000 });

      if (!result) return;
      const parts = result.split('|||');
      if (parts.length < 3) return;
      const currentBid = parts[0]?.trim() || '';
      const currentRole = parts[1]?.trim() || '';
      const currentFieldText = parts[2]?.trim() || '';

      if (currentBid !== bundleId || currentRole !== fieldRole) return;
      if (!currentFieldText) return;
      if (currentFieldText.includes(text) || currentFieldText === text) return;

      const dictWords = getDictWords();
      const prompt = buildEditDiffPrompt(text, currentFieldText, dictWords);
      state.llmService!.extractTerms(prompt, cfg, dictWords)
        .then(terms => saveDictionaryTerms(terms, 'auto-diff'))
        .catch(e => console.error('[AutoDict:post-paste]', e));
    } catch (e) {
      console.error('[AutoDict:post-paste] error:', e);
    }
  }, 5000);
}
