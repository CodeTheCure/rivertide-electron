import { useConfigStore } from '../../stores/configStore';
import { Toggle, Select, Button, SettingRow } from '../../components/ui';
import { PrivacyPolicy } from '../../components/PrivacyPolicy';
import { TermsOfService } from '../../components/TermsOfService';
import { useTranslation } from '../../i18n';
import { useState } from 'react';
import type { AppConfig } from '../../types/config';

export function PrivacySettings() {
  const { config, set, clearHistory } = useConfigStore();
  const { t } = useTranslation();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTos, setShowTos] = useState(false);

  const handleClearAll = () => {
    if (confirm(t('settings.privacy.clearConfirm'))) {
      clearHistory();
    }
  };

  return (
    <div className="space-y-5">
      <Toggle
        checked={config.historyEnabled}
        onChange={(v) => set('historyEnabled', v)}
        label={t('settings.privacy.saveHistory')}
        description={t('settings.privacy.saveHistoryDesc')}
      />

      {config.historyEnabled && (
        <SettingRow label={t('settings.privacy.retention')} description={t('settings.privacy.retentionHint')}>
          <Select
            value={config.historyRetention}
            onChange={(e) => set('historyRetention', e.target.value as AppConfig['historyRetention'])}
            options={[
              { value: 'forever', label: t('settings.privacy.forever') },
              { value: '30d', label: t('settings.privacy.30d') },
              { value: '7d', label: t('settings.privacy.7d') },
              { value: '24h', label: t('settings.privacy.24h') },
              { value: '1h', label: t('settings.privacy.1h') },
            ]}
          />
        </SettingRow>
      )}

      <hr className="border-surface-100 dark:border-surface-800/40" />

      <div className="space-y-2">
        <Button variant="secondary" size="sm" onClick={handleClearAll}>
          {t('settings.privacy.clearAll')}
        </Button>
        <p className="text-xs text-surface-400 dark:text-surface-500">
          {t('settings.privacy.clearAllHint')}
        </p>
      </div>

      <hr className="border-surface-100 dark:border-surface-800/40" />

      {/* Contact & Support */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{t('settings.privacy.contact')}</p>
        <p className="text-xs text-surface-400 dark:text-surface-500">{t('settings.privacy.contactDesc')}</p>
        <a
          href="https://www.codethecure.app/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-brand-500 hover:text-brand-400 transition-colors underline underline-offset-2"
        >
          {t('settings.privacy.contactLink')}
        </a>
      </div>

      <hr className="border-surface-100 dark:border-surface-800/40" />

      <div className="space-y-2">
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Legal</p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPrivacy(true)}
            className="text-xs text-brand-500 hover:text-brand-400 transition-colors underline underline-offset-2"
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setShowTos(true)}
            className="text-xs text-brand-500 hover:text-brand-400 transition-colors underline underline-offset-2"
          >
            Terms of Service
          </button>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowPrivacy(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-800 w-[560px] max-h-[75vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <PrivacyPolicy onClose={() => setShowPrivacy(false)} />
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowTos(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-800 w-[560px] max-h-[75vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <TermsOfService onClose={() => setShowTos(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
