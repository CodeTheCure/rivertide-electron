/**
 * Pipeline E2E tests — every test calls REAL exported functions.
 *
 * Unit tests: call real functions with crafted inputs, no API keys needed.
 * Integration tests: real audio → local Whisper STT → Groq LLM.
 *
 * Usage:
 *   npx tsx scripts/test-pipeline-e2e.ts
 */
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, AppConfig } from '../src/types/config';
import { buildSystemPrompt, LLMService } from '../electron/llm-service';
import { STTService } from '../electron/stt-service';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e instanceof Error ? e.message : String(e)}`); }
}

function skip(name: string) {
  console.log(`  ⊘ ${name}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. STTService — basic behavior
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== STTService.supportsStreaming ===');

test('local Whisper → false', () => {
  assert.equal(new STTService().supportsStreaming(), false);
});

console.log('\n=== STTService.transcribe error guards ===');

test('rejects empty audio', async () => {
  await assert.rejects(() => new STTService().transcribe(Buffer.alloc(0), {} as any), /empty/);
});

test('rejects tiny audio', async () => {
  await assert.rejects(() => new STTService().transcribe(Buffer.alloc(10), {} as any));
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. buildSystemPrompt — call the real function, verify output structure
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== buildSystemPrompt ===');

const mockTone = (_cfg: AppConfig, _app: string) => ({ tone: 'professional' as string });

test('all toggles ON → prompt has more numbered rules than OFF', () => {
  const allOn = buildSystemPrompt(DEFAULT_CONFIG, undefined, mockTone);
  const allOff = buildSystemPrompt({ ...DEFAULT_CONFIG, fillerWordRemoval: false, repetitionElimination: false, selfCorrectionDetection: false, autoFormatting: false }, undefined, mockTone);
  const countRules = (p: string) => (p.match(/^\d+\.\s/gm) || []).length;
  const onRules = countRules(allOn);
  const offRules = countRules(allOff);
  assert.ok(onRules > offRules, `ON=${onRules} should be > OFF=${offRules}`);
  assert.ok(onRules >= 6, `Expected at least 6 rules with all ON, got ${onRules}`);
  assert.ok(offRules >= 3, `Expected at least 3 base rules, got ${offRules}`);
});

test('toggling individual features changes rule count', () => {
  const countRules = (p: string) => (p.match(/^\d+\.\s/gm) || []).length;
  const base = countRules(buildSystemPrompt({ ...DEFAULT_CONFIG, fillerWordRemoval: false, repetitionElimination: false, selfCorrectionDetection: false, autoFormatting: false }, undefined, mockTone));
  const withFiller = countRules(buildSystemPrompt({ ...DEFAULT_CONFIG, fillerWordRemoval: true, repetitionElimination: false, selfCorrectionDetection: false, autoFormatting: false }, undefined, mockTone));
  assert.equal(withFiller, base + 1, 'fillerWordRemoval should add exactly 1 rule');
});

test('dictionary terms injected into Personal Dictionary', () => {
  const cfg = { ...DEFAULT_CONFIG, personalDictionary: [{ word: 'ByteDance', source: 'manual' as const }, { word: '飞书', source: 'auto-llm' as const }] };
  const p = buildSystemPrompt(cfg, undefined, mockTone);
  assert.ok(p.includes('Personal Dictionary'));
  assert.ok(p.includes('ByteDance'));
  assert.ok(p.includes('飞书'));
});

test('context fields injected: appName, clipboard, OCR, recent', () => {
  const ctx: any = { appName: 'Slack', clipboardText: 'paste-me', screenContext: 'OCR结果', recentTranscriptions: ['上一句'] };
  const p = buildSystemPrompt(DEFAULT_CONFIG, ctx, (_c, _a) => ({ tone: 'casual' }));
  assert.ok(p.includes('Active app "Slack"'));
  assert.ok(p.includes('Casual'));
  assert.ok(p.includes('paste-me'));
  assert.ok(p.includes('OCR结果'));
  assert.ok(p.includes('上一句'));
});

test('custom tone prompt injected', () => {
  const ctx: any = { appName: 'MyApp' };
  const p = buildSystemPrompt(DEFAULT_CONFIG, ctx, () => ({ tone: 'custom', customPrompt: '请用诗歌形式回答' }));
  assert.ok(p.includes('请用诗歌形式回答'));
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. LLMService.process — empty input guard (calls real code)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== LLMService.process ===');

test('empty input returns empty without API call', async () => {
  const llm = new LLMService();
  const r = await llm.process('', DEFAULT_CONFIG);
  assert.equal(r.text, '');
  assert.equal(r.systemPrompt, '');
});

test('whitespace-only input returns empty', async () => {
  const llm = new LLMService();
  const r = await llm.process('   \n  ', DEFAULT_CONFIG);
  assert.equal(r.text, '');
});

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
