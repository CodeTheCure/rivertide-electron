/**
 * Speech analysis engine — cognitive wellness metrics from dictation text.
 *
 * ⚠ NOT a medical diagnosis — for personal tracking only.
 *
 * This module builds prompts for the LLM to analyze transcribed speech
 * for cognitive markers, then parses the structured JSON response into
 * a SpeechAnalysis object. It is a pure utility module with no Electron
 * dependencies (other than the config type import).
 */

import { SpeechAnalysis } from '../src/types/config';

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_TEXT_LENGTH = 10;     // minimum text length to bother analyzing

// ─── Prompt Builder ──────────────────────────────────────────────────────────

/**
 * Build the system prompt for speech analysis.
 *
 * Instructs the LLM to analyze a dictation transcript for cognitive
 * markers and return a strict JSON object. Includes the required
 * disclaimer.
 */
export function buildAnalysisPrompt(
  rawText: string,
  processedText: string,
  durationMs: number,
): string {
  const text = processedText || rawText;
  const wordCountEstimate = text.split(/\s+/).filter(Boolean).length;
  const durationSec = durationMs / 1000;
  const wpm = durationSec > 0 ? Math.round(wordCountEstimate / (durationSec / 60)) : 0;

  return `You are a speech analysis assistant. Your task is to analyze a voice dictation transcript for cognitive-communication markers.

⚠ IMPORTANT: The output is for personal tracking only — it is NOT a medical diagnosis.

## Dictation Transcript
"""${text}"""

## Metadata
- Duration: ${durationSec.toFixed(1)} seconds
- Estimated speaking rate: ~${wpm} WPM

## Analysis Instructions

Analyze the transcript across these five dimensions, scoring each 0–100 (higher = better):

1. **fluency** — Rate of filler words (um, uh, like, you know, sort of, I mean), hesitations, false starts. Fewer = higher score. Note any word-finding hesitation markers.

2. **lexicalDiversity** — Variety of vocabulary. Higher type-token ratio, use of precise/specific words = higher score. Overuse of common words, vague language = lower.

3. **syntacticComplexity** — Sentence structure variety. Mix of simple, compound, and complex sentences with subordinate clauses = higher. Short, simple or fragmented sentences = lower.

4. **coherence** — Logical flow and topic maintenance. Clear topic threading, effective use of transition words, staying on topic = higher. Topic jumps, unfinished thoughts, tangents = lower.

5. **clarity** — Self-corrections ("I mean", "actually", "rather"), retractions, and articulation precision. Clear delivery without backtracking = higher. Frequent self-interruptions = lower.

## Detailed Metrics (also compute these)
- fillerWordCount: count of filler/hesitation words (um, uh, like, you know, I mean, sort of, kind of, actually, basically, literally, well, so, right, okay)
- repetitionCount: count of immediate word/phrase repetitions ("I I think", "the the project", repeating a phrase)
- selfCorrectionCount: count of self-corrections ("I went to — I mean, I drove to", "it's on — actually it's under")
- avgSentenceLength: average words per sentence (split by sentence-ending punctuation)
- uniqueWordRatio: ratio of unique words to total words (type-token ratio, 0–1)
- vocabularyLevel: "basic" | "intermediate" | "advanced" based on vocabulary sophistication

## Trend Assessment
Compare the scores to a hypothetical average speaker baseline:
- direction: "improving" if scores are consistently above typical, "declining" if below, "stable" if average, "unknown" if indeterminate
- comparisonToBaseline: percentage points above/below baseline (-100 to +100, 0 = average)

## Output Format
Return ONLY a valid JSON object with NO markdown, NO code fences, NO extra text. The JSON must match this exact structure:

{
  "overallScore": <0-100>,
  "fluency": <0-100>,
  "lexicalDiversity": <0-100>,
  "syntacticComplexity": <0-100>,
  "coherence": <0-100>,
  "clarity": <0-100>,
  "details": {
    "fillerWordCount": <number>,
    "repetitionCount": <number>,
    "selfCorrectionCount": <number>,
    "avgSentenceLength": <number>,
    "uniqueWordRatio": <0-1>,
    "speakingWpm": ${wpm},
    "vocabularyLevel": "basic" | "intermediate" | "advanced"
  },
  "trend": {
    "direction": "improving" | "stable" | "declining" | "unknown",
    "comparisonToBaseline": <-100 to 100>
  }
}

If the text is too short or contains no meaningful speech (gibberish, silence), return an analysis with overallScore: 0 and all sub-scores at 0.`;
}

// ─── Result Parser ───────────────────────────────────────────────────────────

/**
 * Parse a JSON string from the LLM into a SpeechAnalysis object.
 *
 * Handles LLMs that wrap JSON in markdown code fences, or include
 * extra text before/after the JSON. Falls back to null on failure.
 */
export function parseAnalysisResult(llmOutput: string): SpeechAnalysis | null {
  try {
    // Strip markdown code fences if present
    let json = llmOutput.trim();
    const fenceMatch = json.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      json = fenceMatch[1].trim();
    }

    // Find the first '{' and last '}' to extract JSON object
    const start = json.indexOf('{');
    const end = json.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    json = json.slice(start, end + 1);

    const parsed = JSON.parse(json);

    // Validate required fields
    const required = [
      'overallScore', 'fluency', 'lexicalDiversity',
      'syntacticComplexity', 'coherence', 'clarity', 'details', 'trend',
    ];
    for (const key of required) {
      if (!(key in parsed)) return null;
    }

    // Validate details
    const details = parsed.details;
    const detailKeys = [
      'fillerWordCount', 'repetitionCount', 'selfCorrectionCount',
      'avgSentenceLength', 'uniqueWordRatio', 'speakingWpm', 'vocabularyLevel',
    ];
    for (const key of detailKeys) {
      if (!(key in details)) return null;
    }

    if (!['basic', 'intermediate', 'advanced'].includes(details.vocabularyLevel)) {
      return null;
    }

    // Validate trend
    const trend = parsed.trend;
    if (!['improving', 'stable', 'declining', 'unknown'].includes(trend.direction)) {
      return null;
    }

    // Clamp values
    const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v ?? 0));

    return {
      overallScore: clamp(parsed.overallScore),
      fluency: clamp(parsed.fluency),
      lexicalDiversity: clamp(parsed.lexicalDiversity),
      syntacticComplexity: clamp(parsed.syntacticComplexity),
      coherence: clamp(parsed.coherence),
      clarity: clamp(parsed.clarity),
      details: {
        fillerWordCount: Math.max(0, details.fillerWordCount ?? 0),
        repetitionCount: Math.max(0, details.repetitionCount ?? 0),
        selfCorrectionCount: Math.max(0, details.selfCorrectionCount ?? 0),
        avgSentenceLength: Math.max(0, details.avgSentenceLength ?? 0),
        uniqueWordRatio: clamp(details.uniqueWordRatio, 0, 1),
        speakingWpm: Math.max(0, details.speakingWpm ?? 0),
        vocabularyLevel: details.vocabularyLevel,
      },
      trend: {
        direction: trend.direction,
        comparisonToBaseline: clamp(trend.comparisonToBaseline, -100, 100),
      },
      analyzedAt: Date.now(),
      disclaimer: 'NOT_A_DIAGNOSIS',
    };
  } catch {
    return null;
  }
}

// ─── Fallback ────────────────────────────────────────────────────────────────

/**
 * Returns a zeroed-out fallback analysis for when the LLM fails
 * or the text is too short to analyze meaningfully.
 */
export function getEmptyAnalysis(): SpeechAnalysis {
  return {
    overallScore: 0,
    fluency: 0,
    lexicalDiversity: 0,
    syntacticComplexity: 0,
    coherence: 0,
    clarity: 0,
    details: {
      fillerWordCount: 0,
      repetitionCount: 0,
      selfCorrectionCount: 0,
      avgSentenceLength: 0,
      uniqueWordRatio: 0,
      speakingWpm: 0,
      vocabularyLevel: 'basic',
    },
    trend: {
      direction: 'unknown',
      comparisonToBaseline: 0,
    },
    analyzedAt: Date.now(),
    disclaimer: 'NOT_A_DIAGNOSIS',
  };
}

/**
 * Returns true if the text is worth analyzing (has enough meaningful content).
 */
export function shouldAnalyze(text: string): boolean {
  return text.trim().length >= MIN_TEXT_LENGTH;
}
