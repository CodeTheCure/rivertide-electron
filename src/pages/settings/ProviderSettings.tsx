import { useState, useEffect, useRef } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { PasswordInput, Button, SettingRow } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { WHISPER_MODEL_DISPLAY, WHISPER_MODEL_SIZE_MB } from '../../types/config';

type DownloadStatus = 'idle' | 'downloading' | 'done' | 'error';

export function ProviderSettings({ onOpenGuide }: { onOpenGuide?: () => void }) {
  const config = useConfigStore((s) => s.config);
  const set = useConfigStore((s) => s.set);
  const { t } = useTranslation();
  const [dlStatus, setDlStatus] = useState<DownloadStatus>('idle');
  const [dlProgress, setDlProgress] = useState(0);
  const [dlError, setDlError] = useState('');
  const [modelSize, setModelSize] = useState(0);
  const [binaryOk, setBinaryOk] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const mountedRef = useRef(true);

  const checkBinary = () => {
    window.electronAPI?.whisperIsBinaryAvailable().then(setBinaryOk);
  };

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.whisperIsDownloaded().then((dl) => {
      if (dl) setDlStatus('done');
    });
    window.electronAPI.whisperModelSize().then(setModelSize);
    checkBinary();
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    return window.electronAPI.onWhisperDownloadProgress((pct) => {
      if (mountedRef.current) setDlProgress(pct);
    });
  }, []);

  const handleDownload = async () => {
    if (!window.electronAPI) return;
    setDlStatus('downloading');
    setDlProgress(0);
    setDlError('');
    const r = await window.electronAPI.whisperStartDownload();
    if (r.success) {
      setDlStatus('done');
      const size = await window.electronAPI.whisperModelSize();
      setModelSize(size);
      checkBinary();
    } else {
      setDlStatus('error');
      setDlError(r.error || 'Download failed');
    }
  };

  const handleCancelDownload = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.whisperCancelDownload();
    setDlStatus('idle');
  };

  const handleTest = async () => {
    if (!window.electronAPI) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await window.electronAPI.testGroqConnection();
      setTestResult({ ok: r.success, msg: r.success ? (r.message ?? 'OK') : (r.error ?? 'Failed') });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message ?? String(e) });
    }
    setTesting(false);
  };

  const fmtSize = (bytes: number) => {
    if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(0)} KB`;
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* ── Local Whisper (STT) ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-brand-500">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">
            {t('settings.providers.sttTitle')}
          </h3>
        </div>

        <div className="bg-surface-50 dark:bg-surface-850 rounded-xl p-4 border border-surface-200 dark:border-surface-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{WHISPER_MODEL_DISPLAY}</p>
              <p className="text-xs text-surface-500 mt-0.5">
                {dlStatus === 'done'
                  ? `${t('settings.providers.modelDownloaded')} (${fmtSize(modelSize)})`
                  : `~${WHISPER_MODEL_SIZE_MB} MB`}
              </p>
            </div>

            {dlStatus === 'downloading' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-surface-500 tabular-nums">{dlProgress}%</span>
                <Button variant="ghost" size="sm" onClick={handleCancelDownload}>
                  {t('common.cancel')}
                </Button>
              </div>
            ) : dlStatus === 'done' && binaryOk ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t('settings.providers.ready')}</span>
              </span>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {t('settings.providers.download')}
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {dlStatus === 'downloading' && (
            <div className="w-full h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-300"
                style={{ width: `${dlProgress}%` }}
              />
            </div>
          )}

          {/* Binary not ready after model download */}
          {dlStatus === 'done' && !binaryOk && (
            <p className="mt-2 text-xs text-amber-500">
              Model downloaded, but <code className="text-amber-600">whisper-cli</code> binary not found.
              {navigator.platform.includes('Mac')
                ? ' Install it: brew install whisper-cpp'
                : ' The binary download may have failed. Try running the download again.'}
            </p>
          )}

          {/* Error */}
          {dlStatus === 'error' && (
            <p className="mt-2 text-xs text-red-500">{dlError}</p>
          )}
        </div>
      </div>

      <hr className="border-surface-200 dark:border-surface-800/40" />

      {/* ── Groq (LLM) ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-brand-500">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">Groq (LLM)</h3>
        </div>

        <SettingRow wide label={t('settings.providers.apiKey')} description={t('settings.providers.apiKeyDesc')}>
          <PasswordInput
            value={config.groqApiKey}
            onChange={(e) => set('groqApiKey', e.target.value)}
            placeholder="gsk_..."
          />
        </SettingRow>

        {onOpenGuide && (
          <button
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 transition-colors"
          >
            {t('settings.providers.groqGuideLink')}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        )}

        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <Button variant="secondary" size="sm" onClick={handleTest} loading={testing} disabled={testing}>
            {!testing && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
            {t('settings.providers.testConnection')}
          </Button>
          {testResult && (
            testResult.ok ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">OK</span>
                <span className="text-surface-400">·</span>
                <span className="text-surface-500 tabular-nums">{testResult.msg}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-red-500/10 border border-red-500/20">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span className="text-red-600 dark:text-red-400 font-medium">Error</span>
                <span className="text-surface-400">·</span>
                <span className="text-surface-500">{testResult.msg}</span>
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
