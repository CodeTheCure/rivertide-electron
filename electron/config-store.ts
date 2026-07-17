import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { AppConfig, DEFAULT_CONFIG } from '../src/types/config';

/**
 * Apply all migrations to a raw config object. Returns { config, changed }.
 * Pure function — no side effects, no file I/O.
 */
export function migrateConfig(raw: any): { config: AppConfig; changed: boolean } {
  const result = { ...DEFAULT_CONFIG, ...raw };
  let changed = false;

  // Migration 1: personalDictionary string[] → DictionaryEntry[]
  if (Array.isArray(result.personalDictionary) && result.personalDictionary.length > 0
      && typeof result.personalDictionary[0] === 'string') {
    result.personalDictionary = result.personalDictionary.map((w: string) => ({
      word: w, source: 'manual', addedAt: Date.now(),
    }));
    changed = true;
  }

  // Migration 2: old provider fields → simplified config
  // If old sttProvider was set and not 'local', mark as migrated
  if (result.sttProvider && result.sttProvider !== 'local') {
    result.sttProvider = 'local';
    changed = true;
  }

  // Migration 3: remove old providers record if it exists but is complex
  if (result.providers && typeof result.providers === 'object') {
    // Clear old provider configs to free space
    const hasOldData = Object.keys(result.providers).length > 0;
    if (hasOldData) {
      result.providers = {};
      changed = true;
    }
  }

  // Migration 4: rename cerebrasApiKey → groqApiKey
  if (result.cerebrasApiKey && !result.groqApiKey) {
    result.groqApiKey = result.cerebrasApiKey;
    delete result.cerebrasApiKey;
    changed = true;
  }

  return { config: result, changed };
}

// ─── ConfigStore ─────────────────────────────────────────────────────────────

export class ConfigStore {
  private filePath: string;
  private data: AppConfig;

  constructor() {
    const userDir = app?.getPath?.('userData') ?? path.join(process.env.HOME || '.', '.rivertide');
    this.filePath = path.join(userDir, 'config.json');
    const { config, changed } = this.load();
    this.data = config;
    if (changed) this.save();
  }

  private load(): { config: AppConfig; changed: boolean } {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        return migrateConfig(raw);
      }
    } catch (e) {
      console.error('[ConfigStore] load error — attempting backup recovery:', e);
      const bakPath = this.filePath + '.bak';
      try {
        if (fs.existsSync(bakPath)) {
          const raw = JSON.parse(fs.readFileSync(bakPath, 'utf-8'));
          console.log('[ConfigStore] recovered from backup');
          return migrateConfig(raw);
        }
      } catch (bakErr) {
        console.error('[ConfigStore] backup recovery also failed:', bakErr);
      }
    }
    return { config: { ...DEFAULT_CONFIG }, changed: false };
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmpPath = this.filePath + '.tmp';
      const json = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(tmpPath, json, 'utf-8');
      if (fs.existsSync(this.filePath)) {
        try { fs.copyFileSync(this.filePath, this.filePath + '.bak'); } catch {}
      }
      fs.renameSync(tmpPath, this.filePath);
    } catch (e) {
      console.error('[ConfigStore] save error:', e);
    }
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.data[key];
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.data[key] = value;
    this.save();
  }

  getAll(): AppConfig {
    return { ...this.data };
  }
}
