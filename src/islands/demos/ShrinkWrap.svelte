<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount, untrack } from 'svelte';

  let text = $state('The quick brown fox jumps over the lazy dog near the river.');
  let fontSize = $state(20);
  let maxWidth = $state(500);
  let isTight = $state(false);
  let autoPlaying = $state(false);
  let animFrame = 0;

  let computedHeight = $state(0);
  let lineCount = $state(0);
  let widestLineWidth = $state(0);
  let displayWidth = $state(500);
  let lineWidths: number[] = $state([]);

  function computeLayout() {
    const font = buildFont(fontSize);
    const lh = fontSize * 1.5;
    const prepared = prepareWithSegments(text, font);
    const result = layoutWithLines(prepared, maxWidth, lh);

    computedHeight = result.height;
    lineCount = result.lineCount;

    let maxLineW = 0;
    lineWidths = [];
    for (const line of result.lines) {
      lineWidths.push(Math.round(line.width));
      if (line.width > maxLineW) maxLineW = line.width;
    }
    widestLineWidth = Math.ceil(maxLineW);
    displayWidth = isTight ? widestLineWidth + 2 : maxWidth;
  }

  function toggleTight() {
    isTight = !isTight;
    computeLayout();
  }

  function startAutoPlay() {
    autoPlaying = true;
    const tick = () => {
      if (!autoPlaying) return;
      isTight = !isTight;
      computeLayout();
      setTimeout(() => {
        if (autoPlaying) animFrame = requestAnimationFrame(tick);
      }, 1200);
    };
    tick();
  }

  function stopAutoPlay() {
    autoPlaying = false;
    cancelAnimationFrame(animFrame);
  }

  $effect(() => {
    const _t = text;
    const _fs = fontSize;
    const _mw = maxWidth;
    const _it = isTight;
    untrack(() => computeLayout());
  });
  onMount(() => { startAutoPlay(); return () => stopAutoPlay(); });
</script>

<div class="shrink-demo">
  <div class="controls-bar">
    <div class="ctrl" style="flex: 1; min-width: 180px;">
      <label>Text</label>
      <textarea bind:value={text} rows="2"></textarea>
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="12" max="40" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Max width <span>{maxWidth}px</span></label>
      <input type="range" min="120" max="700" bind:value={maxWidth} />
    </div>
    <button
      class="snap-btn"
      class:tight={isTight}
      onclick={toggleTight}
    >
      {isTight ? 'Expand' : 'Snap to tight fit'}
    </button>
    <button
      class="auto-btn"
      class:playing={autoPlaying}
      onclick={() => autoPlaying ? stopAutoPlay() : startAutoPlay()}
    >
      {autoPlaying ? '⏸' : '▶'}
    </button>
  </div>

  <div class="metrics">
    <div class="metric-pill">
      <span class="mp-label">Lines</span>
      <span class="mp-value">{lineCount}</span>
    </div>
    <div class="metric-pill">
      <span class="mp-label">Max width</span>
      <span class="mp-value">{maxWidth}px</span>
    </div>
    <div class="metric-pill accent">
      <span class="mp-label">Widest line</span>
      <span class="mp-value">{widestLineWidth}px</span>
    </div>
    <div class="metric-pill" class:accent={isTight}>
      <span class="mp-label">Display</span>
      <span class="mp-value">{Math.round(displayWidth)}px</span>
    </div>
    <div class="metric-pill">
      <span class="mp-label">Saved</span>
      <span class="mp-value">{maxWidth - widestLineWidth}px</span>
    </div>
  </div>

  <!-- Width comparison bars -->
  <div class="width-comparison">
    <div class="width-row">
      <span class="wr-label">Max</span>
      <div class="wr-bar" style="width: {Math.min(100, (maxWidth / 700) * 100)}%">
        <div class="wr-fill wr-max" style="width: 100%"></div>
      </div>
      <span class="wr-val">{maxWidth}px</span>
    </div>
    <div class="width-row">
      <span class="wr-label">Tight</span>
      <div class="wr-bar" style="width: {Math.min(100, (maxWidth / 700) * 100)}%">
        <div class="wr-fill wr-tight" style="width: {(widestLineWidth / maxWidth) * 100}%"></div>
      </div>
      <span class="wr-val accent-text">{widestLineWidth}px</span>
    </div>
  </div>

  <!-- Line width visualization -->
  <div class="line-bars">
    {#each lineWidths as lw, i}
      <div class="line-bar-row">
        <span class="lb-num">{i + 1}</span>
        <div class="lb-track">
          <div
            class="lb-fill"
            class:widest={lw === widestLineWidth}
            style="width: {(lw / maxWidth) * 100}%"
          ></div>
        </div>
        <span class="lb-val" class:widest-val={lw === widestLineWidth}>{lw}px</span>
      </div>
    {/each}
  </div>

  <!-- Preview -->
  <div class="preview-container">
    <div
      class="preview-box"
      class:tight={isTight}
      style="width: {displayWidth}px; font-size: {fontSize}px; line-height: {fontSize * 1.5}px;"
    >
      {text}
    </div>
  </div>
</div>

<style>
  .shrink-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .snap-btn {
    padding: 6px 18px; border-radius: var(--radius-md); border: 2px solid var(--accent);
    background: transparent; color: var(--accent); font-size: 0.82rem;
    font-weight: 700; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-base);
  }
  .snap-btn:hover, .snap-btn.tight {
    background: var(--accent); color: #fff;
    box-shadow: 0 4px 20px var(--accent-dim);
  }

  .auto-btn {
    padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--accent);
    background: transparent; color: var(--accent); font-size: 0.82rem;
    cursor: pointer; transition: all var(--transition-fast);
  }
  .auto-btn:hover, .auto-btn.playing { background: var(--accent); color: #fff; }

  .metrics {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .metric-pill {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 12px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px; font-size: 0.78rem;
  }
  .metric-pill.accent { border-color: var(--accent); }
  .mp-label { color: var(--text-muted); }
  .mp-value { font-family: var(--font-mono); font-weight: 700; color: var(--text-primary); }
  .metric-pill.accent .mp-value { color: var(--accent); }

  .width-comparison { display: flex; flex-direction: column; gap: 8px; }
  .width-row { display: flex; align-items: center; gap: 10px; }
  .wr-label { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); width: 36px; }
  .wr-bar {
    height: 12px; background: var(--bg-card); border-radius: 6px;
    overflow: hidden; flex: 1; border: 1px solid var(--border);
  }
  .wr-fill { height: 100%; border-radius: 6px; transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
  .wr-max { background: var(--border-hover); }
  .wr-tight { background: var(--accent); }
  .wr-val { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); width: 50px; }
  .accent-text { color: var(--accent); font-weight: 700; }

  .line-bars { display: flex; flex-direction: column; gap: 3px; }
  .line-bar-row { display: flex; align-items: center; gap: 8px; }
  .lb-num {
    font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted);
    width: 16px; text-align: right;
  }
  .lb-track {
    flex: 1; height: 8px; background: var(--bg-card); border-radius: 4px;
    overflow: hidden;
  }
  .lb-fill {
    height: 100%; background: var(--accent); border-radius: 4px;
    opacity: 0.5; transition: width 0.3s ease;
  }
  .lb-fill.widest { opacity: 1; background: #3ecf8e; }
  .lb-val { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-muted); width: 45px; }
  .widest-val { color: #3ecf8e; font-weight: 700; }

  .preview-container { overflow-x: auto; padding-top: var(--space-sm); }

  .preview-box {
    background: var(--bg-secondary);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    color: var(--text-primary);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .preview-box.tight {
    border-color: var(--accent);
    box-shadow: 0 0 30px var(--accent-dim);
  }
</style>
