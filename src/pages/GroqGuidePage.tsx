import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui';
import { useTranslation } from '../i18n';

const CONSOLE_URL = 'https://console.groq.com';
const KEYS_URL = 'https://console.groq.com/keys';

export function GroqGuidePage({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title={t('guide.title')} subtitle={t('guide.subtitle')} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-8 py-2 pb-10 space-y-6">
          {/* What this is for */}
          <div className="rt-card p-5 border-l-4 border-l-emerald-500">
            <h2 className="text-sm font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-emerald-500">
                <path d="M12 8v4l2.5 2.5"/><circle cx="12" cy="12" r="10"/>
              </svg>
              {t('guide.purposeTitle')}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-surface-600 dark:text-surface-300">
              {t('guide.purposeBody')}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-surface-500 dark:text-surface-400">
              {t('guide.purposeModel', { model: 'openai/gpt-oss-20b' })}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => {
              const step = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6;
              return (
                <div key={step} className="rt-card p-5 flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 text-sm font-bold flex items-center justify-center shrink-0">
                      {step}
                    </span>
                    {step < 6 && <span className="w-px flex-1 bg-surface-200 dark:bg-surface-700 my-1.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                      {t(`guide.steps.${step}.title`)}
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-surface-500 dark:text-surface-400">
                      {t(`guide.steps.${step}.body`)}
                    </p>
                    {step === 1 && (
                      <div className="mt-3">
                        <a href={CONSOLE_URL} target="_blank" rel="noopener noreferrer">
                          <Button variant="secondary" size="sm">
                            {t('guide.openConsole')}
                          </Button>
                        </a>
                      </div>
                    )}
                    {step === 3 && (
                      <div className="mt-3">
                        <a href={KEYS_URL} target="_blank" rel="noopener noreferrer">
                          <Button variant="secondary" size="sm">
                            {t('guide.openKeysPage')}
                          </Button>
                        </a>
                      </div>
                    )}
                    {step === 6 && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <Button variant="secondary" size="sm" onClick={onOpenSettings}>
                          {t('guide.openSettings')}
                        </Button>
                        <span className="text-xs text-surface-400 dark:text-surface-500">
                          {t('guide.finalHint')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security tips */}
          <div className="rt-card p-5 border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
            <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-amber-500">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {t('guide.securityTitle')}
            </h3>
            <ul className="mt-3 space-y-2 list-disc list-inside text-[13px] leading-relaxed text-surface-600 dark:text-surface-300">
              <li>{t('guide.securityLocal')}</li>
              <li>{t('guide.securityLost')}</li>
              <li>{t('guide.securityShare')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
