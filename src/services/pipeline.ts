/**
 * Full dictation pipeline: Audio → STT → LLM → Polished text.
 */

import { AppConfig } from '../types/config';
import { transcribeAudio } from './sttService';
import { processText } from './llmService';

export interface PipelineResult {
  success: boolean;
  rawText: string;
  processedText: string;
  skipped?: boolean;
  error?: string;
  systemPrompt?: string;
  sttModel?: string;
  llmModel?: string;
  sttDurationMs?: number;
  llmDurationMs?: number;
}

export async function runPipeline(
  audioBuffer: ArrayBuffer,
  _config: AppConfig,
): Promise<PipelineResult> {
  if (window.electronAPI) {
    return window.electronAPI.processPipeline(audioBuffer);
  }

  // Browser-mode pipeline
  console.log('[Pipeline] Stage 1: STT (local Whisper)...');
  const sttStart = Date.now();
  const stt = await transcribeAudio(audioBuffer);
  const sttDurationMs = Date.now() - sttStart;

  if (!stt.success) {
    return { success: false, rawText: '', processedText: '', error: stt.error, sttDurationMs };
  }

  const rawText = stt.text ?? '';
  if (!rawText.trim()) {
    return { success: true, rawText: '', processedText: '', skipped: true, sttDurationMs };
  }

  return { success: true, rawText, processedText: rawText, sttDurationMs };
}
