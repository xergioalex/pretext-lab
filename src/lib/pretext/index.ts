/**
 * Centralized Pretext imports and helpers.
 * All demos should import from here for consistency.
 */
export {
  prepare,
  prepareWithSegments,
  layout,
  layoutWithLines,
  layoutNextLine,
  walkLineRanges,
  profilePrepare,
  clearCache,
  setLocale,
} from '@chenglou/pretext';

export type {
  PreparedText,
  PreparedTextWithSegments,
  LayoutResult,
  LayoutLine,
  LayoutLineRange,
  LayoutLinesResult,
  LayoutCursor,
  PrepareProfile,
  PrepareOptions,
} from '@chenglou/pretext';

/** Default font string for demos */
export const DEFAULT_FONT = '16px Inter, sans-serif';

/** Build a CSS font string */
export function buildFont(size: number, family = 'Inter, sans-serif'): string {
  return `${size}px ${family}`;
}

/** Sample texts for demos */
export const SAMPLE_TEXTS = {
  short: 'The quick brown fox jumps over the lazy dog.',
  medium:
    'Pretext turns text layout into a programmable primitive. Instead of reading from the DOM after every change, you prepare once and relayout cheaply many times. This unlocks interactive layout systems that were previously impractical.',
  long: `Typography on the web has always been constrained by the DOM's layout model. Every time you need to know how tall a paragraph will be at a given width, you have to render it, read the computed height, and hope nothing triggers an expensive reflow. Pretext changes this equation entirely. By separating text analysis from layout computation, it lets you treat text dimensions as pure functions: give it a width, get back a height and line count instantly. This seemingly simple shift enables entirely new categories of UI — from text-aware masonry grids to editorial layouts with flowing content around arbitrary shapes. The key insight is that most of the expensive work (Unicode segmentation, word boundary detection, font measurement) only needs to happen once per text block. After that, relayout at any width is just arithmetic.`,
  editorial: `In the beginning was the word, and the word had width. Every typesetter since Gutenberg has wrestled with the same fundamental problem: given a block of text and a column of finite width, how do you break the text into lines that are both readable and beautiful? The DOM gives us one answer — an opaque, imperative, take-it-or-leave-it answer. Pretext offers another: a programmable, composable, inspectable answer that puts the developer back in control of every line break, every measurement, every layout decision.`,
} as const;
