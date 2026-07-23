/**
 * src/components/MermaidDiagram.tsx
 *
 * Renders a Mermaid.js diagram string as an inline SVG within a slide card.
 * Uses mermaid.render() for controlled rendering inside React's lifecycle.
 * Handles invalid syntax gracefully with a subtle fallback message.
 */

import { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';
import { GitBranch, AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// One-time global initialisation — dark theme to match Fafanua's UI
// ---------------------------------------------------------------------------
let mermaidInitialised = false;

function ensureMermaidInit() {
  if (mermaidInitialised) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      darkMode: true,
      background: 'transparent',
      primaryColor: '#92400e',        // amber-800
      primaryTextColor: '#fef3c7',    // amber-100
      primaryBorderColor: '#b45309',  // amber-700
      lineColor: '#78716c',           // stone-500
      secondaryColor: '#1e3a5f',
      tertiaryColor: '#14532d',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: '13px',
    },
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 12,
    },
  });
  mermaidInitialised = true;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MermaidDiagramProps {
  /** Raw Mermaid.js syntax to render (e.g. "graph TD; A-->B;"). */
  code: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

  // Generate a stable unique ID for this diagram instance
  const reactId = useId();
  const diagramId = `mermaid-${reactId.replace(/:/g, '')}`;

  useEffect(() => {
    if (!code.trim()) return;

    let cancelled = false;

    async function renderDiagram() {
      ensureMermaidInit();

      try {
        const { svg } = await mermaid.render(diagramId, code.trim());
        if (!cancelled) {
          setSvgHtml(svg);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setSvgHtml(null);
          setError(true);
        }
        // Mermaid may inject an error element into the DOM — clean it up
        const errorEl = document.getElementById(`d${diagramId}`);
        if (errorEl) errorEl.remove();
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, diagramId]);

  // Don't render anything for empty diagram code
  if (!code.trim()) return null;

  // Error fallback — subtle, non-intrusive
  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500/50 shrink-0" />
        <span className="text-[11px] text-white/30">
          Diagram could not be rendered — the AI may have produced invalid syntax.
        </span>
      </div>
    );
  }

  // SVG rendered successfully
  if (svgHtml) {
    return (
      <div className="space-y-2">
        {/* Label */}
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3 h-3 text-white/20" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
            Diagram
          </span>
        </div>

        {/* SVG container — scrollable for wide diagrams */}
        <div
          ref={containerRef}
          className="
            overflow-x-auto rounded-xl bg-white/[0.03]
            border border-white/[0.06] p-4
            [&_svg]:mx-auto [&_svg]:max-w-full
          "
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </div>
    );
  }

  // Loading state (brief, while mermaid.render resolves)
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03]">
      <div className="w-3 h-3 rounded-full border-2 border-white/10 border-t-amber-500/50 animate-spin" />
      <span className="text-[11px] text-white/25">Rendering diagram…</span>
    </div>
  );
}
