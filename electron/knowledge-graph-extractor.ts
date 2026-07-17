/**
 * Knowledge Graph auto-extraction module.
 * Extracts personal facts from dictation text using LLM and adds them to the knowledge graph.
 * Follows the same post-pipeline setImmediate pattern as auto-dict.ts.
 */

import { state } from './app-state';
import { AppConfig, KnowledgeNode } from '../src/types/config';
import { errMsg } from './utils';

// ─── Persistence helpers ──────────────────────────────────────────────────

function getExistingLabels(): string[] {
  const kg: KnowledgeNode[] = state.configStore!.get('knowledgeGraph') || [];
  return kg.map(n => n.label.toLowerCase().trim());
}

function isDuplicateLabel(label: string, existingLabels: string[]): boolean {
  const normalized = label.toLowerCase().trim();
  return existingLabels.some(existing =>
    existing === normalized ||
    existing.includes(normalized) ||
    normalized.includes(existing)
  );
}

function saveKGNodes(
  nodes: Array<{ label: string; content: string; category: string }>,
): KnowledgeNode[] {
  if (!nodes.length) return [];

  const existingLabels = getExistingLabels();
  const existingNodes: KnowledgeNode[] = state.configStore!.get('knowledgeGraph') || [];
  const newEntries: KnowledgeNode[] = [];

  for (const node of nodes) {
    const label = node.label.trim();
    if (!label) continue;
    if (isDuplicateLabel(label, existingLabels)) {
      console.log(`[KG] skip duplicate label: "${label}"`);
      continue;
    }

    const now = Date.now();
    const entry: KnowledgeNode = {
      id: now.toString(36) + Math.random().toString(36).slice(2, 6),
      label,
      content: node.content.trim(),
      category: node.category || 'personal',
      source: 'auto-llm',
      createdAt: now,
      updatedAt: now,
    };
    existingLabels.push(label.toLowerCase().trim());
    newEntries.push(entry);
  }

  if (!newEntries.length) return [];

  const updated = [...existingNodes, ...newEntries];
  state.configStore!.set('knowledgeGraph', updated);
  console.log('[KG] added nodes:', newEntries.map(n => n.label));

  // Broadcast to main window
  if (state.mainWindow && !state.mainWindow.isDestroyed()) {
    state.mainWindow.webContents.send('knowledgeGraph:auto-added', newEntries);
  }

  return newEntries;
}

// ─── Extraction function ──────────────────────────────────────────────────

async function runExtraction(raw: string, processed: string, cfg: AppConfig) {
  const existingLabels = getExistingLabels();

  try {
    const nodes = await state.llmService!.extractKnowledgeGraph(raw, processed, cfg, existingLabels);
    if (!nodes.length) {
      console.log('[KG] no nodes extracted');
      return;
    }

    const saved = saveKGNodes(nodes);
    console.log(`[KG] extracted and saved ${saved.length} node(s):`, saved.map(n => n.label));
  } catch (e) {
    console.error('[KG] extraction error:', errMsg(e));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Called after pipeline completes successfully.
 * Extracts KG facts from dictation text in a fire-and-forget setImmediate.
 */
export function schedulePostPipelineKG(raw: string, processed: string, cfg: AppConfig) {
  // Guard checks
  if (!cfg.knowledgeGraphEnabled) return;
  if (!raw.trim() || !processed.trim()) return;
  if (raw.length < 5) return;

  // Skip only if text is truly identical (not just punctuation)
  const stripPunct = (s: string) => s.replace(/[\s,.!?;:，。！？；：\-—""''「」【】（）()·…、]/g, '');
  const strippedRaw = stripPunct(raw);
  const strippedProcessed = stripPunct(processed);
  if (strippedRaw === strippedProcessed && strippedRaw.length < 10) {
    console.log('[KG] skip — short text, no substantive changes');
    return;
  }

  setImmediate(() => {
    runExtraction(raw, processed, cfg).catch(e =>
      console.error('[KG] unexpected error:', errMsg(e)),
    );
  });
}
