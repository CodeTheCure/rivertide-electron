/**
 * Local Whisper STT service.
 * Manages downloading a GGML Whisper model and running transcription
 * via the whisper.cpp CLI.
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { execFile, execSync } from 'child_process';
import { WHISPER_MODEL, WHISPER_MODEL_URL } from '../src/types/config';

// ─── Paths ──────────────────────────────────────────────────────────────────

function getModelsDir(): string {
  const dir = path.join(app.getPath('userData'), 'whisper-models');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getBinaryDir(): string {
  const dir = path.join(app.getPath('userData'), 'whisper-bin');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function modelPath(): string {
  return path.join(getModelsDir(), WHISPER_MODEL);
}

/** Determine the whisper.cpp CLI binary name for the current platform */
function whisperBinaryName(): string {
  if (process.platform === 'win32') return 'whisper-cli.exe';
  return 'whisper-cli';
}

function whisperBinaryPath(): string {
  return path.join(getBinaryDir(), whisperBinaryName());
}

// ─── WhisperService ─────────────────────────────────────────────────────────

export class WhisperService {
  private _downloadProgress = 0;
  private _downloading = false;
  private _abortController: AbortController | null = null;

  // ─── Model status ───────────────────────────────────────────────────────

  isModelDownloaded(): boolean {
    try {
      return fs.existsSync(modelPath()) && fs.statSync(modelPath()).size > 1_000_000;
    } catch {
      return false;
    }
  }

  isBinaryAvailable(): boolean {
    try {
      if (fs.existsSync(whisperBinaryPath())) return true;
      execSync('which whisper-cli', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  getDownloadProgress(): number {
    return this._downloadProgress;
  }

  isDownloading(): boolean {
    return this._downloading;
  }

  modelFileSize(): number {
    try {
      if (fs.existsSync(modelPath())) return fs.statSync(modelPath()).size;
    } catch {}
    return 0;
  }

  // ─── Download ───────────────────────────────────────────────────────────

  /**
   * Download the Whisper GGML model from Hugging Face.
   * Emits progress via a callback (0–100).
   */
  async downloadModel(
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    if (this._downloading) throw new Error('Download already in progress');
    this._downloading = true;
    this._downloadProgress = 0;
    this._abortController = new AbortController();

    try {
      const response = await fetch(WHISPER_MODEL_URL, {
        signal: this._abortController.signal,
      });
      if (!response.ok) {
        throw new Error(`Model download failed: HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let received = 0;

      const reader = response.body!.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total) {
            this._downloadProgress = Math.round((received / total) * 100);
            onProgress?.(this._downloadProgress);
          }
        }
      }

      // Write to temp file then rename (atomic write)
      const tmpPath = modelPath() + '.download';
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(tmpPath, buf);
      fs.renameSync(tmpPath, modelPath());

      this._downloadProgress = 100;
      onProgress?.(100);

      // Also try to download whisper binary if not present
      await this.downloadBinaryIfNeeded(onProgress);
    } catch (e: any) {
      this._downloadProgress = 0;
      onProgress?.(0);
      // Clean up partial file
      try { if (fs.existsSync(modelPath() + '.download')) fs.unlinkSync(modelPath() + '.download'); } catch {}
      if ((e as Error).name === 'AbortError') {
        throw new Error('Download cancelled');
      }
      throw e;
    } finally {
      this._downloading = false;
      this._abortController = null;
    }
  }

  cancelDownload(): void {
    this._abortController?.abort();
  }

  private async downloadBinaryIfNeeded(onProgress?: (p: number) => void): Promise<void> {
    if (this.isBinaryAvailable()) return;

    const tag = 'v1.9.1';

    // macOS: install via Homebrew (no pre-built binary in releases)
    if (process.platform === 'darwin') {
      // Check if whisper-cli is already on PATH
      try {
        execSync('which whisper-cli', { timeout: 5000 });
        console.log('[Whisper] whisper-cli already on PATH');
        return;
      } catch {}
      console.log('[Whisper] Installing via brew install whisper-cpp...');
      try {
        execSync('brew install whisper-cpp', { timeout: 120_000, stdio: 'inherit' });
        console.log('[Whisper] brew install succeeded');
      } catch (e: any) {
        throw new Error(
          'Failed to install whisper-cpp via Homebrew. ' +
          'Please run "brew install whisper-cpp" manually in Terminal. ' +
          `(${(e as Error).message})`
        );
      }
      return;
    }

    const platformMap: Record<string, { asset: string; extract: (buf: Buffer) => Buffer }> = {
      'linux-x64': {
        asset: 'whisper-bin-ubuntu-x64.tar.gz',
        extract: (buf) => {
          const tmpDir = app.getPath('temp');
          const archivePath = path.join(tmpDir, `whisper-bin-${Date.now()}.tar.gz`);
          fs.writeFileSync(archivePath, buf);
          execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`, { timeout: 30000 });
          const extracted = path.join(tmpDir, 'whisper-bin-ubuntu-x64', 'whisper-cli');
          const bin = fs.readFileSync(extracted);
          fs.rmSync(path.join(tmpDir, 'whisper-bin-ubuntu-x64'), { recursive: true, force: true });
          fs.unlinkSync(archivePath);
          return bin;
        },
      },
      'linux-arm64': {
        asset: 'whisper-bin-ubuntu-arm64.tar.gz',
        extract: (buf) => {
          const tmpDir = app.getPath('temp');
          const archivePath = path.join(tmpDir, `whisper-bin-${Date.now()}.tar.gz`);
          fs.writeFileSync(archivePath, buf);
          execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`, { timeout: 30000 });
          const extracted = path.join(tmpDir, 'whisper-bin-ubuntu-arm64', 'whisper-cli');
          const bin = fs.readFileSync(extracted);
          fs.rmSync(path.join(tmpDir, 'whisper-bin-ubuntu-arm64'), { recursive: true, force: true });
          fs.unlinkSync(archivePath);
          return bin;
        },
      },
      'win32-x64': {
        asset: 'whisper-bin-x64.zip',
        extract: (buf) => {
          const tmpDir = app.getPath('temp');
          const archivePath = path.join(tmpDir, `whisper-bin-${Date.now()}.zip`);
          fs.writeFileSync(archivePath, buf);
          const extractDir = path.join(tmpDir, `whisper-extract-${Date.now()}`);
          fs.mkdirSync(extractDir, { recursive: true });
          execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${extractDir}'"`, { timeout: 30000 });
          const binPath = path.join(extractDir, 'whisper-cli.exe');
          const bin = fs.readFileSync(binPath);
          fs.rmSync(extractDir, { recursive: true, force: true });
          fs.unlinkSync(archivePath);
          return bin;
        },
      },
    };

    const key = `${process.platform}-${process.arch}`;
    const entry = platformMap[key];
    if (!entry) {
      throw new Error(`No pre-built binary available for ${key}. Build whisper.cpp from source or install via package manager.`);
    }

    const url = `https://github.com/ggml-org/whisper.cpp/releases/download/${tag}/${entry.asset}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binary download failed (HTTP ${response.status}). Install whisper.cpp manually.`);
    }
    const buf = Buffer.from(await response.arrayBuffer());
    const binBuf = entry.extract(buf);
    const binPath = whisperBinaryPath();
    fs.writeFileSync(binPath, binBuf);
    fs.chmodSync(binPath, 0o755);
    console.log('[Whisper] Binary downloaded to', binPath);
  }

  // ─── Transcription ──────────────────────────────────────────────────────

  /**
   * Transcribe audio using whisper.cpp CLI.
   * Falls back to error if binary isn't available.
   */
  async transcribe(audioBuffer: Buffer): Promise<string> {
    if (!this.isModelDownloaded()) {
      throw new Error('Whisper model not downloaded. Go to Settings → Speech Recognition to download it.');
    }

    // Write audio to temp WAV file
    const tmpDir = app.getPath('temp');
    const wavPath = path.join(tmpDir, `rivertide-${Date.now()}.wav`);
    fs.writeFileSync(wavPath, audioBuffer);

    try {
      // Try downloaded binary first, then system (brew) whisper-cli
      if (fs.existsSync(whisperBinaryPath())) {
        return await this.transcribeWithCLI(wavPath);
      }
      return await this.transcribeWithSystemWhisper(wavPath);
    } finally {
      try { fs.unlinkSync(wavPath); } catch {}
    }
  }

  /**
   * Run whisper-cli and read transcription from stdout.
   * `--no-prints` means "do not print anything other than the results",
   * so the transcription still appears on stdout — just without loading noise.
   */
  private transcribeWithArgs(wavPath: string, binPath: string): Promise<string> {
    const model = modelPath();

    return new Promise((resolve, reject) => {
      execFile(binPath,
        ['-f', wavPath, '-m', model, '--no-prints', '-nt', '--language', 'auto'],
        { timeout: 120_000 },
        (err, stdout, stderr) => {
          if (err) {
            reject(new Error(`Whisper CLI error: ${err.message}. stderr: ${stderr.slice(0, 200)}`));
            return;
          }
          resolve(stdout.trim());
        },
      );
    });
  }

  private transcribeWithCLI(wavPath: string): Promise<string> {
    return this.transcribeWithArgs(wavPath, whisperBinaryPath());
  }

  private transcribeWithSystemWhisper(wavPath: string): Promise<string> {
    let binPath: string;
    try {
      binPath = execSync('which whisper-cli', { timeout: 5000 }).toString().trim();
    } catch {
      try {
        binPath = execSync('which whisper', { timeout: 5000 }).toString().trim();
      } catch {
        return Promise.reject(new Error('whisper-cli not found. Install it via "brew install whisper-cpp".'));
      }
    }
    return this.transcribeWithArgs(wavPath, binPath);
  }

  // ─── Connection test ────────────────────────────────────────────────────

  async testConnection(): Promise<{ success: boolean; text?: string; error?: string }> {
    const t0 = Date.now();

    if (!this.isModelDownloaded()) {
      return { success: false, error: 'Whisper model not downloaded' };
    }

    // Create a tiny silent WAV to test
    const sampleRate = 16000;
    const durationSec = 0.3;
    const numSamples = Math.floor(sampleRate * durationSec);
    const dataBytes = numSamples * 2;
    const buf = Buffer.alloc(44 + dataBytes);
    const ascii = (off: number, s: string) => { for (let i = 0; i < s.length; i++) buf.writeUInt8(s.charCodeAt(i), off + i); };
    ascii(0, 'RIFF'); buf.writeUInt32LE(36 + dataBytes, 4);
    ascii(8, 'WAVE'); ascii(12, 'fmt ');
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    ascii(36, 'data'); buf.writeUInt32LE(dataBytes, 40);

    try {
      await this.transcribe(buf);
      return { success: true, text: `${Date.now() - t0}ms` };
    } catch (e: any) {
      if (e.message?.includes('No speech') || e.message?.includes('silence')) {
        return { success: true, text: `${Date.now() - t0}ms` };
      }
      return { success: false, error: e.message || String(e) };
    }
  }
}
