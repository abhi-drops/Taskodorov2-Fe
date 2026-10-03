import { togglePanelCollapsed, usePanelLayout } from '../../lib/storage/panelLayout'

/**
 * The ☰ button that opens/closes a `SidePanel`, meant to sit in a page's toolbar
 * (e.g. the far left and far right of the Diary header). It shares state with the panel
 * through `lib/storage/panelLayout.ts` by `storageKey`, so it can live anywhere on the
 * page. Square, ink-bordered, `shadow-card`, like the toolbar's other controls. The
 * hamburger turns ink-filled while its panel is open, so you can tell at a glance.
 */
export function SidebarToggle({ storageKey, label }: { storageKey: string; label: string }) {
  const { collapsed } = usePanelLayout(storageKey)
  return (
    <button
      type="button"
      onClick={() => togglePanelCollapsed(storageKey)}
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? 'Show' : 'Hide'} ${label}`}
      title={`${collapsed ? 'Show' : 'Hide'} ${label}`}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-card border-2 border-ink shadow-card transition-colors ${
        collapsed ? 'bg-white text-ink hover:bg-slate-50' : 'bg-ink text-white hover:opacity-90'
      }`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
        <rect x="2" y="3" width="12" height="2" fill="currentColor" />
        <rect x="2" y="7" width="12" height="2" fill="currentColor" />
        <rect x="2" y="11" width="12" height="2" fill="currentColor" />
      </svg>
    </button>
  )
}
