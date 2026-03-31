# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Build Commands

```bash
npm install --legacy-peer-deps   # Install (--legacy-peer-deps required)
npm run dev                       # Dev server at localhost:4321
npm run build                     # Production build to ./dist/
npm run preview                   # Preview production build locally
npm run check                     # TypeScript type checking via astro check
```

The `--legacy-peer-deps` flag is needed due to peer dependency conflicts between Astro 5 and the Svelte integration.

## Architecture

This is a **static Astro site** with **Svelte interactive islands** — a public demo lab for the [@chenglou/pretext](https://github.com/chenglou/pretext) text layout library. The architecture is intentional: static content-first shell (Astro) with client-only interactive demos (Svelte).

### Key architectural decisions

- **All Svelte islands use `client:only="svelte"`** (not `client:load`). Pretext requires browser Canvas API for font measurement, so SSR is impossible. Every demo page must use this directive.
- **Pretext imports are centralized** through `src/lib/pretext/index.ts`. All demos import from there, never directly from `@chenglou/pretext`.
- **Demo metadata lives in `src/lib/content/demos.ts`**. This array drives the homepage grid, nav dropdown, and provides structured data (slug, title, APIs, category, difficulty). Add new demos here first.
- **GitHub Pages base path**: configured as `/pretext-minilab/` in `astro.config.mjs`. All internal links use `import.meta.env.BASE_URL` which includes the trailing slash.
- **Svelte import aliasing**: In demo pages, Svelte components are imported with an `Island` suffix (e.g., `MeasureHeightIsland`) to avoid naming conflicts with Astro's auto-generated page component declarations.

### Adding a new demo

1. Add metadata to `src/lib/content/demos.ts`
2. Create Svelte island at `src/islands/demos/MyDemo.svelte`
3. Create Astro page at `src/pages/demos/my-demo.astro`
4. The page imports DemoLayout + the Svelte island with `client:only="svelte"` (use `Island` suffix)
5. Add the slug to the Nav demos array in `src/components/Nav.astro`

### Demo page structure

Each demo follows a fixed pattern:
- **Astro page** (`src/pages/demos/*.astro`): wraps island in `DemoLayout`, passes metadata props, adds static info cards below
- **Svelte island** (`src/islands/demos/*.svelte`): manages state with `$state`, computes layout reactively with `$effect`, renders controls + visualization
- Info cards always include: "What this demonstrates", "Relevant Pretext API", and a third contextual section

### Svelte island pattern

All islands use Svelte 5 runes (`$state`, `$effect`). The common pattern:
```svelte
import { prepare, layout, buildFont } from '../../lib/pretext';
let text = $state(...);
let width = $state(400);
$effect(() => {
  const prepared = prepare(text, buildFont(fontSize));
  result = layout(prepared, width, lineHeight);
});
```

### Styling

- Design tokens (colors, spacing, radii, transitions) are CSS custom properties in `src/styles/global.css`
- Dark-first palette with accent `#7c6cf0`
- Fonts: Inter (body), JetBrains Mono (code) — loaded from Google Fonts in BaseLayout
- Component styles are scoped in both Astro and Svelte files
- Shared utility classes: `.container`, `.section`, `.card`, `.btn`, `.demo-area`, `.demo-controls`, `.stats-row`, `.stat`

### Pretext API surface (verified from @chenglou/pretext v0.0.3)

- `prepare(text, font)` → `PreparedText` (opaque, fast path reuse)
- `layout(prepared, maxWidth, lineHeight)` → `{ height, lineCount }`
- `prepareWithSegments(text, font)` → `PreparedTextWithSegments` (with segments array)
- `layoutWithLines(prepared, maxWidth, lineHeight)` → `{ height, lineCount, lines[] }`
- `layoutNextLine(prepared, cursor, maxWidth)` → `LayoutLine | null` (variable width per line)
- `walkLineRanges(prepared, maxWidth, onLine)` → line count
- `profilePrepare(text, font)` → timing breakdown

### Escaping curly braces in Astro

Astro interprets `{` in template text as expressions. When writing literal curly braces in HTML content (e.g., `{ height, lineCount }`), use HTML entities: `&#123;` and `&#125;`.

## Deployment

GitHub Actions workflow at `.github/workflows/deploy.yml` auto-deploys to GitHub Pages on push to `main`. Requires the repo's Pages settings to use "GitHub Actions" as the source.
