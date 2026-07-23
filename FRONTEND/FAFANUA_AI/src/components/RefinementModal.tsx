/**
 * src/components/RefinementModal.tsx
 *
 * A modal overlay that lets users send a natural-language refinement
 * instruction for a specific slide to the AI backend.
 * Styled to match the "Anti-Generic Technical" aesthetic with warm colours,
 * clean typography, and soft shadows. Uses Framer Motion for smooth entry/exit.
 */

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wand2, X, Loader2, Sparkles } from 'lucide-react';
import type { Slide } from '../types/slide';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RefinementModalProps {
  /** Controls visibility of the modal. */
  isOpen: boolean;
  /** Called when the user cancels / closes the modal. */
  onClose: () => void;
  /** The slide currently being refined — shown for context. */
  slide: Slide | null;
  /** Called when the user submits a refinement instruction. */
  onSubmit: (instruction: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 28, stiffness: 360 },
  },
  exit: { opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.18 } },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RefinementModal({
  isOpen,
  onClose,
  slide,
  onSubmit,
}: RefinementModalProps) {
  const [instruction, setInstruction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset internal state when the modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInstruction('');
      setError(null);
      setIsSubmitting(false);
      // Auto-focus the textarea after the open animation completes
      setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !isSubmitting) onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async () => {
    if (!instruction.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(instruction.trim());
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Try again.');
      setIsSubmitting(false);
    }
  };

  // Submit on Ctrl/Cmd + Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && slide && (
        <motion.div
          key="refinement-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={isSubmitting ? undefined : onClose}
          />

          {/* Modal card */}
          <motion.div
            className="
              relative z-10 w-full max-w-lg
              rounded-2xl border border-amber-700/30
              bg-gradient-to-b from-[#1a1714] to-[#141218]
              shadow-2xl shadow-amber-950/40
              overflow-hidden
            "
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
                  <Wand2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white/90 tracking-tight">
                    Refine Slide
                  </h3>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    Powered by IBM Granite AI
                  </p>
                </div>
              </div>
              <button
                id="close-refinement-modal-btn"
                onClick={onClose}
                disabled={isSubmitting}
                className="
                  w-7 h-7 rounded-lg flex items-center justify-center
                  text-white/30 hover:text-white/70 hover:bg-white/[0.06]
                  disabled:opacity-30 disabled:cursor-not-allowed
                  transition-all
                "
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Current slide context */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/60 mb-1.5">
                  Current Slide
                </p>
                <p className="text-sm font-semibold text-white/80 leading-snug">
                  {slide.title}
                </p>
                {slide.bullet_points.length > 0 && (
                  <p className="text-xs text-white/35 mt-1 line-clamp-2">
                    {slide.bullet_points[0]}
                    {slide.bullet_points.length > 1 &&
                      ` (+${slide.bullet_points.length - 1} more)`}
                  </p>
                )}
              </div>

              {/* Instruction input */}
              <div>
                <label
                  htmlFor="refinement-instruction"
                  className="block text-xs font-semibold text-white/50 mb-2"
                >
                  How should I change this slide?
                </label>
                <textarea
                  ref={textareaRef}
                  id="refinement-instruction"
                  className="
                    w-full min-h-28 rounded-xl px-4 py-3
                    bg-white/[0.04] border border-white/10
                    text-sm text-white/80 placeholder:text-white/20
                    resize-none leading-relaxed
                    focus:outline-none focus:border-amber-600/60 focus:bg-white/[0.06]
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-200
                  "
                  placeholder="e.g. Make it more concise, add a point about security, change the tone to be more formal..."
                  value={instruction}
                  onChange={(e) => {
                    setInstruction(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                  spellCheck={false}
                />
                <p className="text-[10px] text-white/20 mt-1.5 text-right">
                  {instruction.length > 0 && (
                    <span className="mr-2">{instruction.length} chars</span>
                  )}
                  <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-white/30 font-mono text-[9px]">
                    ⌘↵
                  </kbd>{' '}
                  to submit
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-700/40 bg-red-950/30 px-3 py-2.5 text-xs text-red-300">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  <p>{error}</p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-3 px-6 pb-5">
              <button
                id="cancel-refinement-btn"
                onClick={onClose}
                disabled={isSubmitting}
                className="
                  flex-1 px-4 py-2.5 rounded-xl
                  text-sm font-medium text-white/50
                  border border-white/10 bg-white/[0.03]
                  hover:text-white/80 hover:border-white/20 hover:bg-white/[0.06]
                  disabled:opacity-30 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                Cancel
              </button>
              <button
                id="submit-refinement-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || !instruction.trim()}
                className="
                  flex-1 flex items-center justify-center gap-2
                  px-4 py-2.5 rounded-xl font-semibold text-sm
                  bg-gradient-to-r from-amber-500 to-orange-600
                  text-white shadow-lg shadow-amber-900/30
                  hover:from-amber-400 hover:to-orange-500
                  active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                  transition-all duration-200
                "
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Refining…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Refine Slide
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
