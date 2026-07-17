/**
 * Unit tests for config.ts constants and defaults.
 *
 * Usage: npx tsx scripts/test-config-helpers.ts
 */
import assert from 'node:assert/strict';
import { AppConfig, DEFAULT_CONFIG, GROQ_BASE_URL, GROQ_MODEL } from '../src/types/config';
import { migrateConfig } from '../electron/config-store';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== Constants ===');

test('GROQ_BASE_URL is set', () => {
  assert.ok(GROQ_BASE_URL);
  assert.ok(GROQ_BASE_URL.includes('groq.com'));
});

test('GROQ_MODEL is set', () => {
  assert.ok(GROQ_MODEL);
});

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== Boolean config field defaults ===');

test('llmPostProcessing defaults to true', () => {
  assert.equal(DEFAULT_CONFIG.llmPostProcessing, true);
});

test('autoLearnDictionary defaults to true', () => {
  assert.equal(DEFAULT_CONFIG.autoLearnDictionary, true);
});

test('autoLearnDictionary=true survives migration', () => {
  const { config } = migrateConfig({ autoLearnDictionary: true });
  assert.equal(config.autoLearnDictionary, true);
});

test('autoLearnDictionary=false is preserved', () => {
  const { config } = migrateConfig({ autoLearnDictionary: false });
  assert.equal(config.autoLearnDictionary, false);
});

test('llmPostProcessing survives migration from empty', () => {
  const { config } = migrateConfig({});
  assert.equal(config.llmPostProcessing, true);
});

test('llmPostProcessing=false is preserved', () => {
  const { config } = migrateConfig({ llmPostProcessing: false });
  assert.equal(config.llmPostProcessing, false);
});

test('all boolean AppConfig fields have explicit defaults', () => {
  const boolFields: (keyof AppConfig)[] = [
    'llmPostProcessing', 'autoFormatting', 'selfCorrectionDetection',
    'fillerWordRemoval', 'repetitionElimination', 'autoLearnDictionary',
    'launchOnStartup', 'alsoWriteClipboard', 'soundEnabled', 'muteSystemAudio',
    'historyEnabled', 'contextL0Enabled', 'contextL1Enabled', 'contextOcrEnabled',
  ];
  for (const field of boolFields) {
    assert.equal(typeof DEFAULT_CONFIG[field], 'boolean', `DEFAULT_CONFIG.${field} should be boolean`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== Default values ===');

test('globalHotkey has a default', () => {
  assert.equal(typeof DEFAULT_CONFIG.globalHotkey, 'string');
  assert.ok(DEFAULT_CONFIG.globalHotkey.length > 0);
});

test('defaultTone is professional', () => {
  assert.equal(DEFAULT_CONFIG.defaultTone, 'professional');
});

test('history is empty array', () => {
  assert.ok(Array.isArray(DEFAULT_CONFIG.history));
  assert.equal(DEFAULT_CONFIG.history.length, 0);
});

test('personalDictionary is empty array', () => {
  assert.ok(Array.isArray(DEFAULT_CONFIG.personalDictionary));
  assert.equal(DEFAULT_CONFIG.personalDictionary.length, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
