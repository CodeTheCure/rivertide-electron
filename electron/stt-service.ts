/**
 * Speech-to-Text service — local Whisper only.
 * Delegates all transcription to the WhisperService in the main process.
 */

import { WhisperService } from './whisper-service';

export class STTService {
  private whisper: WhisperService;

  constructor() {
    this.whisper = new WhisperService();
  }

  /** Batch transcribe audio via local Whisper */
  async transcribe(
    audioBuffer: Buffer,
    _config: any,
    _options?: { language?: string },
  ): Promise<string> {
    return this.whisper.transcribe(audioBuffer);
  }

  /** Check if model is downloaded */
  supportsStreaming(): boolean {
    return false; // local Whisper is batch-only, no streaming
  }

  /** Create a realtime session — not supported for local Whisper */
  createRealtimeSession(): never {
    throw new Error('Streaming not supported with local Whisper');
  }

  /** Test connection by running a short audio clip */
  async testConnection(): Promise<{ success: boolean; text?: string; error?: string }> {
    return this.whisper.testConnection();
  }

  /** Expose the underlying whisper service for IPC handlers */
  getWhisperService(): WhisperService {
    return this.whisper;
  }
}
