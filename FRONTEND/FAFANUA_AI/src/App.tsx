/**
 * src/App.tsx
 *
 * Fafanua – AI Presentation Partner
 * Main dashboard: two-column layout with technical text input on the left
 * and AI-generated slide cards rendered on the right.
 */

import { useState } from 'react';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  ClipboardPaste,
  Presentation,
  ChevronRight,
} from 'lucide-react';

import { generatePresentation } from './services/api';
import SlideCard from './components/SlideCard';
import SkeletonLoader from './components/SkeletonLoader';
import type { Slide } from './types/slide';

// ---------------------------------------------------------------------------
// Placeholder sample — gives the user a working demo out of the box
// ---------------------------------------------------------------------------
const SAMPLE_CONTENT = `Our system is built on a decoupled microservices architecture.
The frontend is a React/Vite SPA that communicates with a Django REST API backend.
The backend integrates with IBM watsonx.ai using the Granite 3.3 8B instruct model
via zero-shot prompting to generate structured JSON slide decks.
Authentication is handled via JWT tokens. The database layer uses PostgreSQL with
Django ORM. CORS is handled by django-cors-headers and the API is documented with
drf-yasg Swagger UI. Deployments are containerised with Docker and orchestrated
via GitHub Actions CI/CD pipelines to a cloud VM.`.trim();

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-700/60 bg-red-950/50 px-4 py-3 text-sm text-red-300">
      <AlertTriangle className="mt-0.5 shrink-0 w-4 h-4 text-red-400" />
      <p>{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 text-center gap-4 py-16">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Presentation className="w-8 h-8 text-white/20" />
      </div>
      <div>
        <p className="text-white/40 text-sm font-medium">No slides generated yet</p>
        <p className="text-white/25 text-xs mt-1">
          Paste technical content on the left and hit Generate
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export default function App() {
  const [content, setContent]   = useState<string>('');
  const [slides, setSlides]     = useState<Slide[]>([]);
  const [loading, setLoading]   = useState<boolean>(false);
  const [error, setError]       = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!content.trim()) return;

    setLoading(true);
    setError(null);
    setSlides([]);

    try {
      const result = await generatePresentation(content);
      setSlides(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSample = () => {
    setContent(SAMPLE_CONTENT);
    setError(null);
  };

  const isDisabled = loading || !content.trim();

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col">

      {/* ---------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">Fafanua</span>
              <span className="ml-2 text-xs text-white/30 font-medium hidden sm:inline">
                AI Presentation Partner
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Powered by IBM Granite 3.3 via watsonx
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Main layout                                                       */}
      {/* ---------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

          {/* ============================================================ */}
          {/* LEFT COLUMN — Input panel                                     */}
          {/* ============================================================ */}
          <section className="flex flex-col gap-4">

            {/* Panel header */}
            <div>
              <h1 className="text-xl font-bold text-white/90 tracking-tight">
                Technical Content
              </h1>
              <p className="text-sm text-white/40 mt-1">
                Paste architecture docs, code snippets, or system logs below.
              </p>
            </div>

            {/* Error banner */}
            {error && <ErrorBanner message={error} />}

            {/* Textarea */}
            <div className="relative flex-1">
              <textarea
                id="technical-content-input"
                className="
                  w-full h-full min-h-72 lg:min-h-[500px]
                  bg-white/[0.04] border border-white/10
                  rounded-2xl px-5 py-4
                  text-sm text-white/80 placeholder:text-white/20
                  resize-none leading-relaxed font-mono
                  focus:outline-none focus:border-amber-600/60 focus:bg-white/[0.06]
                  transition-all duration-200
                "
                placeholder="# System Architecture&#10;&#10;Our microservices stack uses..."
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                spellCheck={false}
              />
              {/* Char counter */}
              <span className="absolute bottom-3 right-4 text-xs text-white/20 font-mono select-none">
                {content.length.toLocaleString()} chars
              </span>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-3">
              {/* Generate button */}
              <button
                id="generate-slides-btn"
                onClick={handleGenerate}
                disabled={isDisabled}
                className="
                  flex-1 flex items-center justify-center gap-2
                  px-6 py-3 rounded-xl font-semibold text-sm
                  bg-gradient-to-r from-amber-500 to-orange-600
                  text-white shadow-lg shadow-amber-900/30
                  hover:from-amber-400 hover:to-orange-500
                  active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                  transition-all duration-200
                "
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating via watsonx…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Slides
                    <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                  </>
                )}
              </button>

              {/* Sample content button */}
              <button
                id="load-sample-btn"
                onClick={handleSample}
                disabled={loading}
                title="Load sample technical content"
                className="
                  flex items-center gap-1.5 px-4 py-3 rounded-xl
                  text-sm font-medium text-white/50
                  border border-white/10 bg-white/[0.03]
                  hover:text-white/80 hover:border-white/20 hover:bg-white/[0.06]
                  disabled:opacity-30 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                <ClipboardPaste className="w-4 h-4" />
                <span className="hidden sm:inline">Sample</span>
              </button>
            </div>
          </section>

          {/* ============================================================ */}
          {/* RIGHT COLUMN — Output panel                                   */}
          {/* ============================================================ */}
          <section className="flex flex-col gap-4">

            {/* Panel header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white/90 tracking-tight">
                  Generated Slides
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  {slides.length > 0
                    ? `${slides.length} slide${slides.length !== 1 ? 's' : ''} generated`
                    : 'AI output will appear here'}
                </p>
              </div>
              {slides.length > 0 && (
                <button
                  id="clear-slides-btn"
                  onClick={() => setSlides([])}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Output area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1
              scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {loading && <SkeletonLoader />}
              {!loading && slides.length === 0 && <EmptyState />}
              {!loading && slides.map((slide, index) => (
                <SlideCard key={index} slide={slide} index={index} />
              ))}
            </div>
          </section>

        </div>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                            */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-white/[0.05] px-6 py-3">
        <p className="text-center text-xs text-white/20">
          Fafanua · IBM AI Builders July Challenge · Built by Steve Austine Kamunge
        </p>
      </footer>

    </div>
  );
}
