/**
 * src/components/SlideCard.tsx
 *
 * Renders a single AI-generated presentation slide as a styled card.
 * Visual appearance is driven by the `theme_variant` field from the API.
 */

import type { Slide, ThemeVariant } from '../types/slide';

interface SlideCardProps {
  slide: Slide;
  index: number;
}

/** Tailwind class bundles keyed by theme_variant. */
const themeStyles: Record<
  ThemeVariant,
  { wrapper: string; badge: string; dot: string }
> = {
  warm: {
    wrapper:
      'bg-amber-950/40 border border-amber-700/50 hover:border-amber-500/70',
    badge:   'bg-amber-800/60 text-amber-300 ring-1 ring-amber-600/40',
    dot:     'bg-amber-400',
  },
  bold: {
    wrapper:
      'bg-blue-950/40 border border-blue-700/50 hover:border-blue-400/70',
    badge:   'bg-blue-800/60 text-blue-300 ring-1 ring-blue-600/40',
    dot:     'bg-blue-400',
  },
  clean: {
    wrapper:
      'bg-emerald-950/40 border border-emerald-700/50 hover:border-emerald-400/70',
    badge:   'bg-emerald-800/60 text-emerald-300 ring-1 ring-emerald-600/40',
    dot:     'bg-emerald-400',
  },
};

export default function SlideCard({ slide, index }: SlideCardProps) {
  // Guard: fall back to 'clean' if the model returns an unexpected variant
  const theme = themeStyles[slide.theme_variant] ?? themeStyles.clean;

  return (
    <article
      className={`
        rounded-2xl p-6 transition-all duration-300 ease-out
        animate-[fadeSlideIn_0.4s_ease-out_both]
        ${theme.wrapper}
      `}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className="text-xs font-semibold text-white/30 uppercase tracking-widest mt-1">
          Slide {index + 1}
        </span>
        <span
          className={`
            shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold
            capitalize tracking-wide ${theme.badge}
          `}
        >
          {slide.theme_variant}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-lg font-bold text-white/95 leading-snug mb-4">
        {slide.title}
      </h2>

      {/* Bullet points */}
      <ul className="space-y-2">
        {slide.bullet_points.map((point, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-white/70 leading-relaxed">
            <span
              className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${theme.dot}`}
            />
            {point}
          </li>
        ))}
      </ul>
    </article>
  );
}
