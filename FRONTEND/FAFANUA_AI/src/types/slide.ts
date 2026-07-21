/**
 * src/types/slide.ts
 *
 * Shared TypeScript interfaces for the Fafanua slide deck data contract.
 * These mirror the exact JSON schema returned by the Django /api/generate/ endpoint.
 */

/** The three visual theme variants the AI can assign to a slide. */
export type ThemeVariant = 'warm' | 'bold' | 'clean';

/** A single presentation slide as returned by the Granite model. */
export interface Slide {
  /** Concise, punchy slide title. */
  title: string;
  /** 3–5 audience-friendly bullet points. */
  bullet_points: string[];
  /** Visual theme variant — drives card styling. */
  theme_variant: ThemeVariant;
}

/** Shape of the API error response body from Django. */
export interface ApiError {
  detail: string;
  upstream_error?: string;
  parse_error?: string;
}
