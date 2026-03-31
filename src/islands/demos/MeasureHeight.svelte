<script lang="ts">
  import { prepare, layout, profilePrepare, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import type { PreparedText, LayoutResult, PrepareProfile } from '../../lib/pretext';
  import { onMount, untrack } from 'svelte';

  let text = $state(SAMPLE_TEXTS.medium);
  let fontSize = $state(16);
  let width = $state(400);
  let lineHeight = $state(24);

  let prepared: PreparedText | null = $state(null);
  let result: LayoutResult | null = $state(null);
  let profile: PrepareProfile | null = $state(null);
  let layoutTimeUs = $state(0);
  let prepareCount = $state(0);
  let layoutCount = $state(0);
  let autoPlaying = $state(false);
  let animFrame = 0;

  function doPrepare(t: string, fs: number) {
    const font = buildFont(fs);
    profile = profilePrepare(t, font);
    prepared = prepare(t, font);
    prepareCount++;
  }

  function doLayout(p: PreparedText, w: number, lh: number) {
    const t0 = performance.now();
    result = layout(p, w, lh);
    layoutTimeUs = Math.round((performance.now() - t0) * 1000);
    layoutCount++;
  }

  $effect(() => {
    const t = text;
    const fs = fontSize;
    untrack(() => doPrepare(t, fs));
  });

  $effect(() => {
    const w = width;
    const lh = lineHeight;
    const p = prepared;
    if (p) untrack(() => doLayout(p, w, lh));
  });

  function startAutoPlay() {
    autoPlaying = true;
    let dir = 3;
    const tick = () => {
      if (!autoPlaying) return;
      width += dir;
      if (width >= 700) dir = -3;
      if (width <= 150) dir = 3;
      animFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopAutoPlay() {
    autoPlaying = false;
    cancelAnimationFrame(animFrame);
  }

  onMount(() => { startAutoPlay(); return () => stopAutoPlay(); });
</script>

<div class="measure-demo">
  <div class="controls-bar">
    <div class="ctrl" style="flex: 1; min-width: 180px;">
      <label>Text</label>
      <textarea bind:value={text} rows="2"></textarea>
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="10" max="40" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Width <span>{width}px</span></label>
      <input type="range" min="100" max="800" bind:value={width} />
    </div>
    <div class="ctrl">
      <label>Line height <span>{lineHeight}px</span></label>
      <input type="range" min="12" max="60" bind:value={lineHeight} />
    </div>
    <button class="auto-btn" class:playing={autoPlaying} onclick={() => autoPlaying ? stopAutoPlay() : startAutoPlay()}>
      {autoPlaying ? '⏸ Stop' : '▶ Auto-play'}
    </button>
  </div>

  <div class="metrics-strip">
    <div class="metric">
      <span class="metric-label">Height</span>
      <div class="metric-row"><span class="metric-val accent-val">{result?.height ?? 0}px</span><div class="metric-bar" style="width: {Math.min(100, (result?.height ?? 0) / 5)}%"></div></div>
    </div>
    <div class="metric">
      <span class="metric-label">Lines</span>
      <div class="metric-row"><span class="metric-val green-val">{result?.lineCount ?? 0}</span><div class="metric-bar green-bar" style="width: {Math.min(100, (result?.lineCount ?? 0) * 8)}%"></div></div>
    </div>
    <div class="metric">
      <span class="metric-label">Prepare</span>
      <div class="metric-row"><span class="metric-val orange-val">{profile?.totalMs.toFixed(2) ?? '–'}ms</span><div class="metric-bar orange-bar" style="width: {Math.min(100, (profile?.totalMs ?? 0) * 20)}%"></div></div>
    </div>
    <div class="metric">
      <span class="metric-label">Layout</span>
      <div class="metric-row"><span class="metric-val cyan-val">{layoutTimeUs}μs</span><div class="metric-bar cyan-bar" style="width: {Math.min(100, layoutTimeUs / 3)}%"></div></div>
    </div>
    <div class="counter">
      <span class="counter-val">{prepareCount}</span> prepares
      <span class="counter-sep">·</span>
      <span class="counter-val">{layoutCount}</span> layouts
    </div>
  </div>

  <div class="preview-wrapper">
    <div class="preview-ruler" style="width: {width}px;">
      <div class="ruler-tick" style="left: 0">0</div>
      <div class="ruler-tick" style="left: 50%">{Math.round(width/2)}</div>
      <div class="ruler-tick" style="right: 0">{width}</div>
    </div>
    <div class="preview-box" style="width: {width}px; font-size: {fontSize}px; line-height: {lineHeight}px;">{text}</div>
    <div class="preview-height-marker" style="height: {result?.height ?? 0}px;"><span>{result?.height ?? 0}px</span></div>
  </div>
</div>

<style>
  .measure-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
  .ctrl label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }
  .auto-btn { padding: 5px 14px; border-radius: var(--radius-sm); border: 1px solid var(--accent); background: transparent; color: var(--accent); font-size: 0.78rem; font-weight: 600; cursor: pointer; font-family: var(--font-body); transition: all var(--transition-fast); }
  .auto-btn:hover, .auto-btn.playing { background: var(--accent); color: #fff; }
  .metrics-strip { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .metric { min-width: 100px; flex: 1; }
  .metric-row { display: flex; align-items: center; gap: 8px; }
  .metric-bar { height: 8px; border-radius: 4px; background: var(--accent); transition: width 0.15s ease; min-width: 4px; }
  .green-bar { background: #3ecf8e; }
  .orange-bar { background: #f5a623; }
  .cyan-bar { background: #06b6d4; }
  .metric-val { font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; white-space: nowrap; }
  .accent-val { color: var(--accent); }
  .green-val { color: #3ecf8e; }
  .orange-val { color: #f5a623; }
  .cyan-val { color: #06b6d4; }
  .metric-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 2px; display: block; }
  .counter { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
  .counter-val { font-family: var(--font-mono); color: var(--accent); font-weight: 700; }
  .counter-sep { color: var(--border); }
  .preview-wrapper { position: relative; padding-left: 40px; padding-top: 20px; overflow-x: auto; }
  .preview-ruler { height: 16px; border-bottom: 2px solid var(--accent); position: relative; margin-bottom: 4px; transition: width 0.08s; }
  .ruler-tick { position: absolute; bottom: -16px; font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-muted); transform: translateX(-50%); }
  .ruler-tick:first-child { transform: none; }
  .ruler-tick:last-child { transform: translateX(-100%); }
  .preview-box { background: var(--bg-secondary); border: 2px solid var(--border); border-radius: var(--radius-md); padding: var(--space-md); color: var(--text-primary); transition: width 0.08s; word-wrap: break-word; overflow-wrap: break-word; margin-top: 8px; }
  .preview-height-marker { position: absolute; left: 0; top: 46px; width: 28px; border: 1px solid var(--accent); border-right: none; border-radius: 4px 0 0 4px; display: flex; align-items: center; justify-content: center; transition: height 0.08s; min-height: 20px; }
  .preview-height-marker span { font-family: var(--font-mono); font-size: 0.55rem; color: var(--accent); writing-mode: vertical-lr; transform: rotate(180deg); font-weight: 700; }
</style>
