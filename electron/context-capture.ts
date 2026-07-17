import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { clipboard, systemPreferences, desktopCapturer, screen, app } from 'electron';
import { state, isMac } from './app-state';
import { errMsg } from './utils';

export function execAsync(cmd: string, opts: { input?: string; timeout?: number } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = exec(cmd, { timeout: opts.timeout ?? 2000, killSignal: 'SIGKILL' }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.toString().trim());
    });
    if (opts.input && proc.stdin) {
      proc.stdin.write(opts.input);
      proc.stdin.end();
    }
  });
}

export interface CapturedContext {
  appName?: string;
  windowTitle?: string;
  bundleId?: string;
  url?: string;
  selectedText?: string;
  fieldText?: string;
  fieldRole?: string;
  fieldRoleDescription?: string;
  fieldLabel?: string;
  fieldPlaceholder?: string;
  cursorPosition?: number;
  selectionRange?: { location: number; length: number };
  numberOfCharacters?: number;
  insertionLineNumber?: number;
  clipboardText?: string;
  recentTranscriptions?: string[];
  screenContext?: string;
  screenshotDataUrl?: string;
  ocrDurationMs?: number;
}

// ─── macOS frontmost app info ─────────────────────────────────────────────

interface AppInfo {
  appName: string;
  windowTitle: string;
  bundleId: string;
}

async function getFrontmostAppMacOS(): Promise<AppInfo | null> {
  try {
    const [appResult, titleResult] = await Promise.all([
      execAsync(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`),
      execAsync(`osascript -e 'tell application "System Events" to get title of first window of first application process whose frontmost is true'`),
    ]);
    const appName = appResult.trim();
    let bundleId = '';
    try {
      bundleId = await execAsync(`osascript -e 'tell application "System Events" to get bundle identifier of first application process whose frontmost is true'`);
    } catch {}
    return { appName: appName || '', windowTitle: titleResult?.trim() || '', bundleId: bundleId?.trim() || '' };
  } catch {
    return null;
  }
}

// ─── macOS Accessibility field info ──────────────────────────────────────

interface AccessibilityInfo {
  selectedText: string;
  fieldText: string;
  fieldRole: string;
  fieldRoleDescription: string;
  fieldLabel: string;
  fieldPlaceholder: string;
  cursorPosition: number;
  selectionRange: { location: number; length: number };
  numberOfCharacters: number;
  insertionLineNumber: number;
}

async function getAccessibilityInfoMacOS(): Promise<Partial<AccessibilityInfo> | null> {
  try {
    const result = await execAsync(`osascript -e '
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set focusedField to focused of text area 1 of window 1 of frontApp
        if focusedField exists then
          try
            set selText to value of attribute "AXSelectedText" of focusedField
          on error
            set selText to ""
          end try
          try
            set fieldVal to value of attribute "AXValue" of focusedField
          on error
            set fieldVal to ""
          end try
          try
            set fieldRole to role of focusedField
          on error
            set fieldRole to ""
          end try
          try
            set fieldRoleDesc to role description of focusedField
          on error
            set fieldRoleDesc to ""
          end try
          try
            set fieldLabel to description of focusedField
          end try
          try
            set fieldPlaceholder to value of attribute "AXPlaceholderValue" of focusedField
          on error
            set fieldPlaceholder to ""
          end try
          try
            set cursorPos to value of attribute "AXInsertionPointLineNumber" of focusedField
          on error
            set cursorPos to 0
          end try
          return selText & "|||" & fieldVal & "|||" & fieldRole & "|||" & fieldRoleDesc & "|||" & fieldLabel & "|||" & fieldPlaceholder & "|||" & cursorPos
        end if
      end tell
    '`, { timeout: 3000 });

    if (!result) return null;
    const parts = result.split('|||');
    if (parts.length < 7) return null;
    return {
      selectedText: parts[0]?.trim() || '',
      fieldText: parts[1]?.trim() || '',
      fieldRole: parts[2]?.trim() || '',
      fieldRoleDescription: parts[3]?.trim() || '',
      fieldLabel: parts[4]?.trim() || '',
      fieldPlaceholder: parts[5]?.trim() || '',
      cursorPosition: parseInt(parts[6]?.trim() || '0', 10) || 0,
    };
  } catch {
    return null;
  }
}

// ─── macOS Browser URL ───────────────────────────────────────────────────

async function getBrowserUrlMacOS(): Promise<string> {
  try {
    const runningBrowsers = ['Safari', 'Google Chrome', 'Arc', 'Brave Browser', 'Firefox', 'Microsoft Edge', 'Opera', 'Vivaldi', 'Chromium'];
    const osa = runningBrowsers
      .map(b => `if application "${b}" is running then
      tell application "${b}" to get URL of current tab of front window as string`)
      .join('\n') + '\nend if';
    const url = await execAsync(`osascript -e '${osa}'`, { timeout: 1500 });
    return url?.trim() || '';
  } catch {
    return '';
  }
}

// ─── Clipboard ──────────────────────────────────────────────────────────

function getClipboardText(): string {
  try { return clipboard.readText()?.trim() || ''; } catch { return ''; }
}

// ─── Screen Capture (macOS native) ──────────────────────────────────────

function captureScreenMac(): string | null {
  try {
    const tmpPath = path.join(app.getPath('temp'), `opentype-ocr-${Date.now()}.jpg`);
    // Capture the display containing the cursor
    execSync(`screencapture -R 0,0,0,0 -t jpg "${tmpPath}"`, { timeout: 5000 });
    // Read and compress
    const buf = fs.readFileSync(tmpPath);
    fs.unlinkSync(tmpPath);
    if (buf.length < 100) return null;
    // Resize to max 1280px wide
    const resizedPath = path.join(app.getPath('temp'), `opentype-ocr-resized-${Date.now()}.jpg`);
    execSync(`sips --resampleWidth 1280 "${resizedPath}" --setProperty jpg 0.7`, { timeout: 3000 });
    try { fs.unlinkSync(tmpPath); } catch {}
    const resizedBuf = fs.readFileSync(resizedPath);
    fs.unlinkSync(resizedPath);
    if (resizedBuf.length < 100) return null;
    return `data:image/jpeg;base64,${resizedBuf.toString('base64')}`;
  } catch (e) {
    console.error('[ScreenCapture] native error:', errMsg(e));
    return null;
  }
}

// ─── Screen Capture (Electron desktopCapturer) ──────────────────────────

async function captureScreenElectron(): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 720 },
      fetchWindowIcons: false,
    });
    if (!sources.length) return null;
    const cursorDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const source = sources.find(s => String(s.display_id) === String(cursorDisplay.id)) || sources[0];
    const thumbnail = source.thumbnail;
    if (thumbnail.isEmpty()) return null;
    const jpegBuffer = thumbnail.toJPEG(80);
    return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
  } catch (e) {
    console.error('[ScreenCapture] electron error:', errMsg(e));
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Capture context at hotkey press time (before overlay steals focus).
 * Returns a CapturedContext with window info, accessibility data, and clipboard.
 */
export async function captureFullContext(
  config: { contextL0Enabled: boolean; contextL1Enabled: boolean },
  recentTranscriptions?: string[],
): Promise<CapturedContext> {
  const ctx: CapturedContext = {};
  ctx.recentTranscriptions = recentTranscriptions;

  const start = Date.now();
  console.log('[Context] capturing...');

  if (config.contextL0Enabled && isMac) {
    // Get frontmost app info
    const appInfo = await getFrontmostAppMacOS();
    if (appInfo) {
      ctx.appName = appInfo.appName;
      ctx.windowTitle = appInfo.windowTitle;
      ctx.bundleId = appInfo.bundleId;
    }
    // Get browser URL
    const url = await getBrowserUrlMacOS();
    if (url) ctx.url = url;
  }

  // Clipboard is always available
  const cb = getClipboardText();
  if (cb) ctx.clipboardText = cb;

  if (config.contextL1Enabled && isMac) {
    const axInfo = await getAccessibilityInfoMacOS();
    if (axInfo) {
      // Only add meaningful fields
      if (axInfo.selectedText) ctx.selectedText = axInfo.selectedText;
      if (axInfo.fieldText) ctx.fieldText = axInfo.fieldText;
      if (axInfo.fieldRole) ctx.fieldRole = axInfo.fieldRole;
      if (axInfo.fieldRoleDescription) ctx.fieldRoleDescription = axInfo.fieldRoleDescription;
      if (axInfo.fieldLabel) ctx.fieldLabel = axInfo.fieldLabel;
      if (axInfo.fieldPlaceholder) ctx.fieldPlaceholder = axInfo.fieldPlaceholder;
      if (axInfo.cursorPosition) ctx.insertionLineNumber = axInfo.cursorPosition;
    }
  }

  const elapsed = Date.now() - start;
  console.log(`[Context] captured in ${elapsed}ms: app="${ctx.appName}"`);

  return ctx;
}

/**
 * Screen OCR is not available in local-only mode.
 * Returns null gracefully.
 */
export async function captureScreenAndOcr(): Promise<{ text: string; screenshot?: string; durationMs: number } | null> {
  console.log('[OCR] Not available — Groq does not support vision models');
  return null;
}
