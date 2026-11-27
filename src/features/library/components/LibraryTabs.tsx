import { m } from 'motion/react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_EDITORIAL } from '../../../utils/motion';
import { cn } from '../../../utils/cn';

export type LibraryTabId =
  | 'all'
  | 'reading'
  | 'favorites'
  | 'pending'
  | 'completed'
  | 'downloads';

export interface LibraryTabItem {
  id: LibraryTabId;
  label: string;
  count: number;
}

interface LibraryTabsProps {
  tabs: LibraryTabItem[];
  activeTab: LibraryTabId;
  onChange: (tab: LibraryTabId) => void;
}

export function LibraryTabs({ tabs, activeTab, onChange }: LibraryTabsProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="border-b border-[#E5E3DD]">
      <div
        role="tablist"
        aria-label="Secciones de mi biblioteca"
        className="flex items-center gap-5 sm:gap-7 overflow-x-auto no-scrollbar -mb-px"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative py-3 min-h-[44px] inline-flex items-center gap-1.5 text-[13.5px] sm:text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5AA70] rounded-t-md',
                isActive
                  ? 'text-[#111E32] font-semibold'
                  : 'text-[#667085] font-medium hover:text-[#111E32]'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'text-[11px] tabular-nums',
                  isActive ? 'text-[#9A7D43] font-semibold' : 'text-[#667085]/70'
                )}
              >
                {tab.count}
              </span>

              {isActive && (
                <m.span
                  layoutId={reducedMotion ? undefined : 'library-tab-gold-indicator'}
                  transition={{ duration: 0.22, ease: EASE_EDITORIAL }}
                  className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-[#C5AA70]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
