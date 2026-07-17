import { useRecorder } from '../hooks/useRecorder';
import { ResultPanel } from '../components/recording/ResultPanel';
import { useConfigStore } from '../stores/configStore';
import { useTranslation } from '../i18n';

export function DictationPage() {
  const recorder = useRecorder();
  const globalHotkey = useConfigStore((s) => s.config.globalHotkey);
  const { t } = useTranslation();

  const hotkey = (globalHotkey || 'CommandOrControl+Shift+Space')
    .replace('CommandOrControl', window.electronAPI?.platform === 'darwin' ? 'Cmd' : 'Ctrl')
    .replace(/\+/g, ' + ');

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const hasResult = !!(recorder.rawText || recorder.processedText || recorder.error);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto flex flex-col">

        <div className={`flex flex-col items-center justify-center px-8 transition-all duration-300 ${hasResult ? 'pt-16 pb-8' : 'flex-1'}`}>

          {/* Mic button area */}
          <div className="relative flex items-center justify-center mb-5">
            {recorder.status === 'recording' && (
              <div className="absolute w-[88px] h-[88px] rounded-full bg-red-500/5" />
            )}
            {recorder.status === 'processing' && (
              <div className="absolute w-[76px] h-[76px] rounded-full border-[2px] border-brand-500/15 border-t-brand-500 animate-spin" />
            )}

            <button
              onClick={recorder.toggleRecording}
              disabled={recorder.status === 'processing'}
              className={`relative z-10 w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all duration-200
                ${recorder.status === 'recording'
                  ? 'bg-red-500 hover:bg-red-600'
                  : recorder.status === 'processing'
                  ? 'bg-surface-100 dark:bg-surface-800 cursor-wait'
                  : 'bg-brand-500 hover:bg-brand-600 hover:scale-105 active:scale-95'
                }`}
            >
              {recorder.status === 'recording' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>
              ) : recorder.status === 'processing' ? (
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-surface-400 dark:bg-surface-500 animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-surface-400 dark:bg-surface-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-surface-400 dark:bg-surface-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22" strokeWidth="2"/>
                </svg>
              )}
            </button>
          </div>

          {/* Status area */}
          <div className="text-center mb-5">
            {recorder.status === 'recording' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-500 dark:text-red-400 text-sm font-medium tracking-wide">{t('dashboard.recording')}</span>
                  <span className="text-xl font-mono text-surface-800 dark:text-surface-200 tracking-widest font-light ml-1">{fmt(recorder.duration)}</span>
                </div>
                <div className="flex items-end justify-center gap-[3px] h-5">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const barH = Math.max(2, (Math.sin(Date.now() / 180 + i * 0.45) * 0.5 + 0.5) * recorder.audioLevel * 18);
                    return (
                      <div key={i} className="w-[2px] rounded-full bg-red-400/40 transition-all duration-75" style={{ height: `${barH}px` }} />
                    );
                  })}
                </div>
              </div>
            ) : recorder.status === 'processing' ? (
              <div className="space-y-1">
                <span className="text-brand-500 dark:text-brand-400 text-sm font-medium">{t('dashboard.processing')}</span>
                <p className="text-[13px] text-surface-400 dark:text-surface-500">{t('dashboard.transcribing')}</p>
              </div>
            ) : (
              <div>
                <h1 className="text-[26px] font-bold text-surface-900 dark:text-surface-100 tracking-tight leading-tight mb-2">
                  {t('dictation.title')}
                </h1>
                <p className="text-sm text-surface-400 dark:text-surface-500">
                  {t('dictation.clickOrPress')}{' '}
                  <kbd className="inline-block px-2 py-0.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-md text-xs text-surface-600 dark:text-surface-300 font-mono shadow-sm">
                    {hotkey}
                  </kbd>
                </p>
              </div>
            )}
          </div>

        </div>

        {hasResult && (
          <div className="px-8 pb-10 max-w-[640px] mx-auto w-full">
            <ResultPanel
              rawText={recorder.rawText}
              processedText={recorder.processedText}
              error={recorder.error}
            />
          </div>
        )}
      </div>
    </div>
  );
}
