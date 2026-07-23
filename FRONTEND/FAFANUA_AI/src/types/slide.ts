/**
 * src/types/slide.ts
 *
 * Shared TypeScript interfaces for the Fafanua slide deck data contract.
 * These mirror the exact JSON schema returned by the Django API endpoints.
 */

/** The three visual theme variants the AI can assign to a slide. */
export type ThemeVariant = 'warm' | 'bold' | 'clean';

/** A single presentation slide as returned by the Granite model. */
export interface Slide {
  /** Auto-increment ID assigned by the database. */
  id: number;
  /** Zero-based ordering index within the presentation. */
  slide_order: number;
  /** Concise, punchy slide title. */
  title: string;
  /** 3–5 audience-friendly bullet points. */
  bullet_points: string[];
  /** Visual theme variant — drives card styling. */
  theme_variant: ThemeVariant;
}

/**
 * A persisted presentation returned by the Django API.
 * Mirrors the PresentationSerializer output.
 */
export interface Presentation {
  /** UUID primary key. */
  id: string;
  /** The original technical content submitted for slide generation. */
  original_text: string;
  /** ISO-8601 creation timestamp. */
  created_at: string;
  /** ISO-8601 last-updated timestamp. */
  updated_at?: string;
  /** Ordered list of generated slides. */
  slides: Slide[];
}

/** Shape of the API error response body from Django. */
export interface ApiError {
  detail: string;
  upstream_error?: string;
  parse_error?: string;
  /** If DB persistence failed, raw slides may still be present. */
  slides?: Slide[];
}
