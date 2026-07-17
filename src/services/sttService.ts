/**
 * Speech-to-Text service — local Whisper via IPC.
 * In Electron, delegates to main process. In browser, returns error (requires Electron).
 */

import { errMsg } from '../utils/errMsg';

export interface STTResult {
  success: boolean;
  text?: string;
  error?: string;
}

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  _config?: any,
  options?: { language?: string },
): Promise<STTResult> {
  if (window.electronAPI) {
    return window.electronAPI.transcribe(audioBuffer, options);
  }
  return { success: false, error: 'Local Whisper requires Electron runtime' };
}
