<script lang="ts">
  import { prepare, layout, buildFont } from '../../lib/pretext';
  import type { PreparedText, LayoutResult } from '../../lib/pretext';
  import { onMount, untrack } from 'svelte';

  const sampleTexts = [
    'Programmable text layout changes how we think about responsive UIs.',
    'Typography has always been about controlling space and readability.',
    'Separate preparation from layout — measurement becomes a pure function.',
    'Interactive panels and draggable resizers benefit from instant relayout.',
    'Unicode segmentation and font metrics are expensive — do them once.',
    'The DOM couples measurement to the rendering pipeline.',
    'Canvas rendering and custom editors need programmable text metrics.',
    'Good typography is invisible. Bad typography is everywhere.',
    'Pretext enables UI patterns previously too expensive to implement.',
    'Text-aware masonry and variable-height virtualization become practical.',
    'The insight: text measurement is expensive, relayout at known width is cheap.',
    'Every line break is a decision you can now observe and control.',
    'Prepare once. Layout at any width. Render however you want.',
    'Chat bubbles, split panes, card grids — all need text measurement.',
    'When layout is a function, the design space expands dramatically.',
    'No more hidden divs. No more layout thrashing. Just arithmetic.',
  ];

  const blockColors = [
    '#7c6cf0', '#3ecf8e', '#f5a623', '#ef4444', '#06b6d4', '#ec4899',
    '#8b5cf6', '#10b981', '#f59e0b', '#6366f1', '#14b8a6', '#e11d48',
    '#7c3aed', '#059669', '#d946ef', '#0ea5e9',
  ];

  let width = $state(400);
  let fontSize = $state(14);
  let totalLayoutUs = $state(0);
  let autoPlaying = $state(false);
  let animFrame = 0;

  interface BlockData {
    text: string;
    color: string;
    prepared: PreparedText;
    result: LayoutResult;
  }

  let blocks: BlockData[] = $state([]);

  function prepareAll() {
    const font = buildFont(fontSize);
    blocks = sampleTexts.map((text, i) => {
      const prepared = prepare(text, font);
      const result = layout(prepared, width, fontSize * 1.5);
      return { text, color: blockColors[i % blockColors.length], prepared, result };
    });
  }

  function relayoutAll() {
    const lh = fontSize * 1.5;
    const t0 = performance.now();
    blocks = blocks.map((b) => ({
      ...b,
      result: layout(b.prepared, width, lh),
    }));
    totalLayoutUs = Math.round((performance.now() - t0) * 1000);
  }

  function startAutoPlay() {
    autoPlaying = true;
    let dir = 4;
    const tick = () => {
      if (!autoPlaying) return;
      width += dir;
      if (width >= 650) dir = -4;
      if (width <= 160) dir = 4;
      animFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopAutoPlay() {
    autoPlaying = false;
    cancelAnimationFrame(animFrame);
  }

  $effect(() => {
    const _fs = fontSize;
    untrack(() => prepareAll());
  });
  $effect(() => {
    const _w = width;
    untrack(() => { if (blocks.length > 0) relayoutAll(); });
  });
  onMount(() => { startAutoPlay(); return () => stopAutoPlay(); });
</script>

<div class="resize-demo">
  <div class="controls-bar">
    <div class="ctrl" style="flex: 1; min-width: 180px;">
      <label>Width <span>{width}px</span></label>
      <input type="range" min="120" max="700" bind:value={width} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="10" max="24" bind:value={fontSize} />
    </div>
    <button
      class="auto-btn"
      class:playing={autoPlaying}
      onclick={() => autoPlaying ? stopAutoPlay() : startAutoPlay()}
    >
      {autoPlaying ? '⏸ Stop' : '▶ Auto-resize'}
    </button>
  </div>

  <div class="perf-bar">
    <div class="perf-item">
      <span class="perf-val">{blocks.length}</span> blocks
    </div>
    <div class="perf-item">
      <span class="perf-val">{totalLayoutUs}μs</span> total
    </div>
    <div class="perf-item">
      <span class="perf-val">{blocks.length > 0 ? Math.round(totalLayoutUs / blocks.length) : 0}μs</span> per block
    </div>
    <div class="perf-item perf-note">
      All {blocks.length} blocks relayouted via <code>layout()</code> — no DOM reads
    </div>
  </div>

  <div class="blocks-scroll">
    <div class="blocks-container" style="max-width: {width}px;">
      {#each blocks as block, i}
        <div
          class="text-block"
          style="
            font-size: {fontSize}px;
            line-height: {fontSize * 1.5}px;
            --block-color: {block.color};
            border-left-color: {block.color};
          "
        >
          <div class="block-header">
            <span class="block-dot" style="background: {block.color}"></span>
            <span class="block-meta">{block.result.lineCount}L · {block.result.height}px</span>
          </div>
          <div class="block-text">{block.text}</div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .resize-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .auto-btn {
    padding: 5px 14px; border-radius: var(--radius-sm); border: 1px solid var(--accent);
    background: transparent; color: var(--accent); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .auto-btn:hover, .auto-btn.playing { background: var(--accent); color: #fff; }

  .perf-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: center;
    padding: 8px 14px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-sm); font-size: 0.78rem;
  }
  .perf-val {
    font-family: var(--font-mono); color: var(--accent); font-weight: 700;
  }
  .perf-item { color: var(--text-muted); }
  .perf-note {
    margin-left: auto; font-size: 0.72rem; color: var(--text-muted);
  }
  .perf-note code {
    font-size: 0.72rem; color: var(--accent); background: none; padding: 0;
  }

  .blocks-scroll { overflow-x: auto; }

  .blocks-container {
    display: flex; flex-direction: column; gap: 8px;
    transition: max-width 0.06s;
  }

  .text-block {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-left: 3px solid;
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    transition: border-color 0.15s;
  }
  .text-block:hover { border-color: var(--block-color); }

  .block-header {
    display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
  }
  .block-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .block-meta {
    font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-muted);
  }

  .block-text {
    color: var(--text-primary);
    word-wrap: break-word; overflow-wrap: break-word;
  }
</style>
