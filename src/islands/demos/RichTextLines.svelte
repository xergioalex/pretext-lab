<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont } from '../../lib/pretext';
  import { untrack } from 'svelte';

  interface Segment {
    text: string;
    style: 'normal' | 'bold' | 'code' | 'accent' | 'badge';
  }

  const richSegments: Segment[] = [
    { text: 'Pretext ', style: 'bold' },
    { text: 'turns text layout into a ', style: 'normal' },
    { text: 'programmable primitive', style: 'accent' },
    { text: '. Use ', style: 'normal' },
    { text: 'prepare()', style: 'code' },
    { text: ' for one-time analysis and ', style: 'normal' },
    { text: 'layout()', style: 'code' },
    { text: ' for instant measurement. It handles ', style: 'normal' },
    { text: 'Unicode', style: 'badge' },
    { text: ', ', style: 'normal' },
    { text: 'CJK', style: 'badge' },
    { text: ', ', style: 'normal' },
    { text: 'emoji', style: 'badge' },
    { text: ', and ', style: 'normal' },
    { text: 'bidirectional text', style: 'accent' },
    { text: '. The ', style: 'normal' },
    { text: 'prepareWithSegments()', style: 'code' },
    { text: ' function returns segments for ', style: 'normal' },
    { text: 'rich inline rendering', style: 'bold' },
    { text: ' with full layout control.', style: 'normal' },
  ];

  let width = $state(500);
  let fontSize = $state(16);

  // We concatenate all segment texts and use Pretext to compute line breaks,
  // then map character positions back to styled segments for rendering.
  let flatText = $state('');
  let lineTexts: Array<{ text: string; segments: Array<{ text: string; style: string }> }> = $state([]);

  function computeLayout() {
    flatText = richSegments.map((s) => s.text).join('');
    const font = buildFont(fontSize);
    const lh = fontSize * 1.7;
    const prepared = prepareWithSegments(flatText, font);
    const result = layoutWithLines(prepared, width, lh);

    // Build segment offsets
    const segmentOffsets: Array<{ start: number; end: number; segment: Segment }> = [];
    let offset = 0;
    for (const seg of richSegments) {
      segmentOffsets.push({ start: offset, end: offset + seg.text.length, segment: seg });
      offset += seg.text.length;
    }

    // Map each line back to styled segments
    lineTexts = result.lines.map((line) => {
      // Find character range for this line
      const lineText = line.text;
      const lineStart = flatText.indexOf(lineText, findApproxStart(result.lines, line));
      const lineEnd = lineStart + lineText.length;

      const lineSegments: Array<{ text: string; style: string }> = [];

      for (const so of segmentOffsets) {
        if (so.end <= lineStart || so.start >= lineEnd) continue;
        const overlapStart = Math.max(so.start, lineStart);
        const overlapEnd = Math.min(so.end, lineEnd);
        const text = flatText.slice(overlapStart, overlapEnd);
        if (text) {
          lineSegments.push({ text, style: so.segment.style });
        }
      }

      return { text: lineText, segments: lineSegments };
    });
  }

  function findApproxStart(lines: any[], targetLine: any): number {
    let pos = 0;
    for (const l of lines) {
      if (l === targetLine) return pos;
      pos += l.text.length;
    }
    return 0;
  }

  $effect(() => {
    const _w = width;
    const _fs = fontSize;
    untrack(() => computeLayout());
  });
</script>

<div class="rich-demo">
  <div class="demo-controls">
    <div class="control-group" style="flex: 1;">
      <label class="control-label" for="rich-width">Width: <span class="control-value">{width}px</span></label>
      <input id="rich-width" type="range" min="200" max="700" bind:value={width} />
    </div>
    <div class="control-group">
      <label class="control-label" for="rich-font">Font: <span class="control-value">{fontSize}px</span></label>
      <input id="rich-font" type="range" min="12" max="28" bind:value={fontSize} />
    </div>
  </div>

  <div class="stats-row">
    <div class="stat">
      <span class="stat-label">Lines</span>
      <span class="stat-value">{lineTexts.length}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Segments</span>
      <span class="stat-value">{richSegments.length}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Characters</span>
      <span class="stat-value">{flatText.length}</span>
    </div>
  </div>

  <div class="rich-preview" style="max-width: {width}px; font-size: {fontSize}px; line-height: {fontSize * 1.7}px;">
    {#each lineTexts as line}
      <div class="rich-line">
        {#each line.segments as seg}
          {#if seg.style === 'bold'}
            <strong>{seg.text}</strong>
          {:else if seg.style === 'code'}
            <code class="inline-code">{seg.text}</code>
          {:else if seg.style === 'accent'}
            <span class="inline-accent">{seg.text}</span>
          {:else if seg.style === 'badge'}
            <span class="inline-badge">{seg.text}</span>
          {:else}
            <span>{seg.text}</span>
          {/if}
        {/each}
      </div>
    {/each}
  </div>

  <div class="segment-legend">
    <h4>Segment styles used</h4>
    <div class="legend-items">
      <span class="legend-item"><strong>Bold</strong></span>
      <span class="legend-item"><code class="inline-code">Code</code></span>
      <span class="legend-item"><span class="inline-accent">Accent</span></span>
      <span class="legend-item"><span class="inline-badge">Badge</span></span>
      <span class="legend-item">Normal</span>
    </div>
  </div>
</div>

<style>
  .rich-demo {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .rich-preview {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    color: var(--text-primary);
    transition: max-width 0.2s ease;
  }

  .rich-line {
    min-height: 1em;
  }

  .inline-code {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: rgba(124, 108, 240, 0.15);
    color: var(--accent);
    padding: 0.1em 0.4em;
    border-radius: 4px;
    border: 1px solid var(--border-accent);
  }

  .inline-accent {
    color: var(--accent);
    font-weight: 600;
  }

  .inline-badge {
    display: inline-block;
    font-size: 0.8em;
    font-weight: 600;
    background: var(--accent-dim);
    color: var(--accent);
    padding: 0.05em 0.5em;
    border-radius: 9999px;
    border: 1px solid var(--border-accent);
    vertical-align: baseline;
  }

  .segment-legend {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
  }

  .segment-legend h4 {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: var(--space-md);
  }

  .legend-items {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md) var(--space-xl);
    align-items: center;
    font-size: 0.9rem;
  }
</style>
