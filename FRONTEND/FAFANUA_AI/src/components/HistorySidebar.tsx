/**
 * src/components/HistorySidebar.tsx
 *
 * Collapsible sidebar displaying previously generated presentations.
 * Desktop: persistent left panel (toggled via button).
 * Mobile:  overlay panel triggered by the same toggle.
 */

import { History, Clock, X, ChevronLeft, Layers } from 'lucide-react';
import type { Presentation } from '../types/slide';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HistorySidebarProps {
  /** Array of past presentations, newest-first. */
  history: Presentation[];
  /** True while the initial history fetch is in-flight. */
  isLoading: boolean;
  /** UUID of the currently viewed presentation (if any). */
  activePresentationId: string | null;
  /** Whether the sidebar panel is expanded. */
  isOpen: boolean;
  /** Called when the user clicks a history item. */
  onSelectPresentation: (id: string) => void;
  /** Called when the toggle button is clicked. */
  onToggle: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats an ISO-8601 timestamp into a short human-readable string. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/** Truncate text to a max length with ellipsis. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

// ---------------------------------------------------------------------------
// Skeleton placeholder for loading state
// ---------------------------------------------------------------------------

function HistorySkeleton() {
  return (
    <div className="space-y-2 px-3 py-2">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="rounded-xl p-3 bg-white/[0.03] animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="h-3 w-3/4 rounded-full bg-white/10 mb-2.5" />
          <div className="h-2.5 w-full rounded-full bg-white/[0.06] mb-1.5" />
          <div className="h-2.5 w-5/6 rounded-full bg-white/[0.06]" />
          <div className="flex items-center gap-1.5 mt-3">
            <div className="h-2 w-2 rounded-full bg-white/[0.06]" />
            <div className="h-2 w-14 rounded-full bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HistorySidebar({
  history,
  isLoading,
  activePresentationId,
  isOpen,
  onSelectPresentation,
  onToggle,
}: HistorySidebarProps) {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Backdrop (mobile only) — closes sidebar on tap                   */}
      {/* ---------------------------------------------------------------- */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Sidebar panel                                                     */}
      {/* ---------------------------------------------------------------- */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full
          flex flex-col
          w-72 bg-[#12121a]/95 backdrop-blur-xl
          border-r border-white/[0.06]
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:z-auto
          ${isOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full lg:w-0 lg:border-0 lg:overflow-hidden'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-900/30">
              <History className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white/80 tracking-tight">
              History
            </span>
            {history.length > 0 && (
              <span className="text-[10px] font-bold text-teal-400/80 bg-teal-500/15 px-1.5 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </div>
          <button
            id="close-history-btn"
            onClick={onToggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
            title="Close history panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 py-2">
          {isLoading && <HistorySkeleton />}

          {!isLoading && history.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <Layers className="w-5 h-5 text-white/15" />
              </div>
              <p className="text-xs text-white/25 leading-relaxed">
                No presentations yet.
                <br />
                Generate your first deck!
              </p>
            </div>
          )}

          {!isLoading &&
            history.map((pres) => {
              const isActive = pres.id === activePresentationId;
              return (
                <button
                  key={pres.id}
                  id={`history-item-${pres.id}`}
                  onClick={() => onSelectPresentation(pres.id)}
                  className={`
                    w-full text-left px-3 py-2 mx-auto block
                    group transition-all duration-200
                  `}
                >
                  <div
                    className={`
                      rounded-xl px-3 py-3
                      transition-all duration-200
                      ${
                        isActive
                          ? 'bg-teal-500/10 border border-teal-500/30 shadow-lg shadow-teal-900/10'
                          : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.05] hover:border-white/[0.08]'
                      }
                    `}
                  >
                    {/* Slide count badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`
                          text-[10px] font-semibold uppercase tracking-widest
                          ${isActive ? 'text-teal-400/80' : 'text-white/25 group-hover:text-white/40'}
                          transition-colors
                        `}
                      >
                        {pres.slides.length} slide{pres.slides.length !== 1 ? 's' : ''}
                      </span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                      )}
                    </div>

                    {/* Text preview */}
                    <p
                      className={`
                        text-xs leading-relaxed line-clamp-2
                        ${isActive ? 'text-white/70' : 'text-white/40 group-hover:text-white/60'}
                        transition-colors
                      `}
                    >
                      {truncate(pres.original_text, 100)}
                    </p>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 mt-2">
                      <Clock
                        className={`w-2.5 h-2.5 ${isActive ? 'text-teal-500/60' : 'text-white/15'}`}
                      />
                      <span
                        className={`
                          text-[10px]
                          ${isActive ? 'text-teal-400/50' : 'text-white/20'}
                        `}
                      >
                        {formatDate(pres.created_at)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-3 border-t border-white/[0.05]">
          <p className="text-[10px] text-white/15 text-center">
            Click an item to view its slides
          </p>
        </div>
      </aside>

      {/* ---------------------------------------------------------------- */}
      {/* Toggle button — visible when sidebar is collapsed                 */}
      {/* ---------------------------------------------------------------- */}
      {!isOpen && (
        <button
          id="open-history-btn"
          onClick={onToggle}
          className="
            fixed bottom-6 left-6 z-50
            flex items-center gap-2 px-4 py-2.5 rounded-xl
            bg-[#1a1a26]/90 backdrop-blur-lg
            border border-white/[0.08]
            text-sm font-medium text-white/50
            hover:text-white/80 hover:border-teal-500/40 hover:bg-[#1a1a26]
            shadow-2xl shadow-black/40
            transition-all duration-300
            group
          "
          title="Open presentation history"
        >
          <History className="w-4 h-4 text-teal-400/70 group-hover:text-teal-400" />
          <span className="hidden sm:inline">History</span>
          {history.length > 0 && (
            <span className="text-[10px] font-bold text-teal-400/80 bg-teal-500/15 px-1.5 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
          <ChevronLeft className="w-3 h-3 text-white/20 rotate-180 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </>
  );
}
