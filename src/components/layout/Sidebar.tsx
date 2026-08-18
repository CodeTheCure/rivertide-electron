import { useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { useTranslation } from '../../i18n';
import logoSrc from '../../assets/logo.png';

export type PageID = 'dashboard' | 'dictation' | 'history' | 'dictionary' | 'chat' | 'knowledgeGraph' | 'analytics' | 'guide';

interface SidebarProps {
  current: PageID;
  onNavigate: (page: PageID) => void;
  onOpenSettings: () => void;
}

const navItems: Array<{ id: PageID; i18nKey: string; icon: JSX.Element }> = [
  {
    id: 'dashboard',
    i18nKey: 'sidebar.home',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: 'dictation',
    i18nKey: 'sidebar.dictation',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>,
  },
  {
    id: 'history',
    i18nKey: 'sidebar.history',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    id: 'dictionary',
    i18nKey: 'sidebar.dictionary',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>,
  },
  {
    id: 'chat',
    i18nKey: 'sidebar.chat',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    id: 'knowledgeGraph',
    i18nKey: 'sidebar.knowledgeGraph',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M2 12a10 10 0 0 1 10-10"/><path d="M2 12a10 10 0 0 0 10 10"/><path d="M12 22a10 10 0 0 0 10-10"/></svg>,
  },
  {
    id: 'analytics',
    i18nKey: 'sidebar.analytics',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
  },
];

export function Sidebar({ current, onNavigate, onOpenSettings }: SidebarProps) {
  const theme = useConfigStore((s) => s.config.theme);
  const set = useConfigStore((s) => s.set);
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    set('theme', next);
  };
  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col border-r border-surface-200 dark:border-surface-800/60 bg-surface-50 dark:bg-surface-950 transition-all duration-200 ${collapsed ? 'w-[60px]' : 'w-[200px]'}`}>
      {/* Brand + collapse toggle (click logo to collapse, hover shows arrow) */}
      <div className="relative px-3 pt-5 pb-4">
        <div
          onClick={() => setCollapsed(!collapsed)}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
          className={`flex items-center cursor-pointer select-none rounded-xl transition-all duration-150
            ${collapsed ? 'justify-center mx-auto' : 'gap-2.5 pl-5'}
            ${logoHovered ? 'bg-surface-100 dark:bg-surface-800/50' : ''}
            py-2 -mx-1 px-3`}
        >
          <img src={logoSrc} className={`w-6 h-6 rounded shrink-0 ${logoHovered ? 'opacity-90' : ''}`} alt="" />
          {!collapsed && (
            <>
              <span className="text-[17px] font-bold text-surface-900 dark:text-surface-100 tracking-tight">
                Rivertide
              </span>
              {/* Collapse arrow — only visible on hover */}
              <span
                className={`ml-auto transition-all duration-150 ease-out
                  ${logoHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-1'}
                  text-surface-400`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M15 10l-4 4-4-4" />
                </svg>
              </span>
            </>
          )}
          {collapsed && logoHovered && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-8 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-surface-400">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150
                ${collapsed ? 'justify-center' : ''}
                ${active
                  ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 font-semibold'
                  : 'text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-850'
                }`}
              title={collapsed ? t(item.i18nKey) : undefined}
            >
              <span className={collapsed ? '' : 'shrink-0'}>{item.icon}</span>
              {!collapsed && <span>{t(item.i18nKey)}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom icons */}
      <div className={`px-2 py-3 border-t border-surface-200 dark:border-surface-800/40 flex items-center gap-1 ${collapsed ? 'flex-col' : ''}`}>
        <button
          onClick={onOpenSettings}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800/60 transition-colors"
          title={t('sidebar.settings')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800/60 transition-colors"
          title={isDark ? t('sidebar.lightMode') : t('sidebar.darkMode')}
        >
          {isDark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
      </div>
    </div>
  );
}
