/**
 * Unit tests for config migration logic (migrateConfig).
 *
 * Usage: npx tsx scripts/test-migration.ts
 */
import assert from 'node:assert/strict';
import { migrateConfig } from '../electron/config-store';
import { DEFAULT_CONFIG } from '../src/types/config';

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
console.log('\n=== Fresh install (empty object) ===');

test('empty object returns defaults, no change', () => {
  const { config, changed } = migrateConfig({});
  assert.equal(changed, false);
  assert.equal(config.sttProvider, 'local');
  assert.ok(Array.isArray(config.personalDictionary));
});

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== personalDictionary migration ===');

test('migrates string[] to DictionaryEntry[]', () => {
  const { config, changed } = migrateConfig({
    personalDictionary: ['word1', 'word2'],
  });
  assert.equal(changed, true);
  assert.equal(config.personalDictionary.length, 2);
  assert.equal(config.personalDictionary[0].word, 'word1');
  assert.equal(config.personalDictionary[0].source, 'manual');
  assert.ok(config.personalDictionary[0].addedAt! > 0);
});

test('does not re-migrate already-migrated dictionary', () => {
  const entries = [{ word: 'x', source: 'manual' as const, addedAt: 123 }];
  const { config, changed } = migrateConfig({ personalDictionary: entries });
  assert.equal(changed, false);
  assert.equal(config.personalDictionary[0].addedAt, 123);
});

test('empty dictionary is untouched', () => {
  const { changed } = migrateConfig({ personalDictionary: [] });
  assert.equal(changed, false);
});

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== sttProvider migration ===');

test('old non-local sttProvider is migrated to local', () => {
  const { config, changed } = migrateConfig({ sttProvider: 'siliconflow' });
  assert.equal(changed, true);
  assert.equal(config.sttProvider, 'local');
});

test('local sttProvider is preserved', () => {
  const { config, changed } = migrateConfig({ sttProvider: 'local' });
  assert.equal(changed, false);
  assert.equal(config.sttProvider, 'local');
});

test('empty sttProvider stays empty', () => {
  const { config, changed } = migrateConfig({ sttProvider: '' });
  assert.equal(config.sttProvider, '');
  assert.equal(changed, false);
});

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== providers cleanup ===');

test('existing providers object is cleared', () => {
  const { config, changed } = migrateConfig({
    providers: { siliconflow: { apiKey: 'sk-x' } },
  });
  assert.equal(changed, true);
  assert.deepEqual(config.providers, {});
});

test('providers as array gets replaced with empty object', () => {
  const { config } = migrateConfig({ providers: [1, 2, 3] });
  assert.ok(typeof config.providers === 'object' && !Array.isArray(config.providers));
});

test('empty providers stays empty', () => {
  const { config, changed } = migrateConfig({ providers: {} });
  assert.equal(changed, false);
  assert.deepEqual(config.providers, {});
});

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== cerebrasApiKey → groqApiKey migration ===');

test('cerebrasApiKey is renamed to groqApiKey', () => {
  const { config, changed } = migrateConfig({
    cerebrasApiKey: 'sk-cerebras',
    providers: {},
  });
  assert.equal(changed, true);
  assert.equal(config.groqApiKey, 'sk-cerebras');
  assert.equal((config as any).cerebrasApiKey, undefined);
});

test('existing groqApiKey takes priority', () => {
  const { config, changed } = migrateConfig({
    cerebrasApiKey: 'sk-cerebras',
    groqApiKey: 'sk-groq',
    providers: {},
  });
  assert.equal(changed, false);
  assert.equal(config.groqApiKey, 'sk-groq');
});

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== Edge cases ===');

test('preserves non-provider config fields', () => {
  const { config } = migrateConfig({
    theme: 'dark',
    globalHotkey: 'F5',
    soundEnabled: false,
  });
  assert.equal(config.theme, 'dark');
  assert.equal(config.globalHotkey, 'F5');
  assert.equal(config.soundEnabled, false);
});

test('unknown fields are passed through', () => {
  const { config } = migrateConfig({ futureField: 'hello' });
  assert.equal((config as any).futureField, 'hello');
});

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== Idempotency ===');

test('migrating twice gives same result', () => {
  const input = {
    sttProvider: 'siliconflow',
    providers: { siliconflow: { apiKey: 'sk-1' } },
    personalDictionary: ['a', 'b'],
    cerebrasApiKey: 'sk-old',
  };
  const first = migrateConfig(input);
  const second = migrateConfig(first.config);
  assert.equal(second.changed, false);
  assert.deepEqual(second.config, first.config, 'Second migration should produce identical config');
});

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
