<script lang="ts">
  import { prepareWithSegments, layoutNextLine, buildFont } from '../../lib/pretext';
  import type { LayoutCursor } from '../../lib/pretext';
  import { onMount, untrack } from 'svelte';

  const articleText = `In the beginning was the word, and the word had width. Every typesetter since Gutenberg has wrestled with the same fundamental problem: given a block of text and a column of finite width, how do you break the text into lines that are both readable and beautiful?

The DOM gives us one answer — an opaque, imperative, take-it-or-leave-it answer. You put text in a container, set a width, and the browser handles the rest. You cannot inspect the line breaks. You cannot predict the height without rendering. You cannot route text around arbitrary shapes without CSS hacks that rarely work well.

Pretext offers another path: a programmable, composable, inspectable answer that puts the developer back in control. Every line break becomes a decision you can observe. Every measurement becomes a function you can call. The layout is no longer a black box — it is a computation you can see, modify, and compose.

This is not about replacing the browser's text renderer. The browser is excellent at rendering. But the browser's layout model couples measurement to rendering in ways that make certain UI patterns expensive or impossible. Pretext decouples them. Prepare once. Measure anywhere. Render however you want.

The result is a new design space. Text that flows around shapes. Cards that pack perfectly. Chat bubbles that size instantly. Editorial layouts that reflow dynamically. Canvas-based text that breaks correctly. All of these become practical when text layout is programmable.`;

  let wrapperWidth = $state(0);
  let containerWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 720);
  let fontSize = $state(17);
  let lineHeight = $state(30);
  let showDropCap = $state(true);
  let showGuides = $state(false);
  let theme = $state<'cream' | 'dark' | 'newspaper'>('dark');

  // Floating orbs
  interface Orb {
    x: number; y: number; radius: number;
    vx: number; vy: number;
    color: string; glowColor: string;
  }

  let orbs: Orb[] = $state([
    { x: 500, y: 120, radius: 60, vx: 0.8, vy: 0.5, color: '#7c6cf0', glowColor: 'rgba(124,108,240,0.15)' },
    { x: 200, y: 280, radius: 45, vx: -0.6, vy: 0.7, color: '#3ecf8e', glowColor: 'rgba(62,207,142,0.12)' },
  ]);
  let orbsActive = $state(true);
  let animFrame = 0;

  let lines: Array<{ text: string; x: number; y: number; lineWidth: number; displaced: boolean }> = $state([]);
  let totalHeight = $state(0);
  let contentTop = 70;

  const themes = {
    cream: { bg: '#faf8f3', text: '#1a1a1a', muted: '#888', pqBg: '#f0ede5', rule: '#1a1a1a' },
    dark: { bg: '#0c0c14', text: '#d4d4d8', muted: '#555', pqBg: '#1a1a26', rule: '#d4d4d8' },
    newspaper: { bg: '#f5f0e8', text: '#222', muted: '#999', pqBg: '#ebe6db', rule: '#222' },
  };

  function isLineBlockedByOrb(y: number, orb: Orb, pad: number): { blocked: boolean; left: number; right: number } {
    const cy = orb.y;
    const cx = orb.x;
    const r = orb.radius + pad;
    const lineMid = y + lineHeight / 2 - contentTop;
    const dy = lineMid - cy;
    if (Math.abs(dy) >= r) return { blocked: false, left: 0, right: 0 };
    const dx = Math.sqrt(r * r - dy * dy);
    return { blocked: true, left: cx - dx, right: cx + dx };
  }

  function computeLayout() {
    const pad = 16;
    const margin = 24;
    const textWidth = containerWidth - margin * 2;
    const font = buildFont(fontSize, 'Georgia, Times New Roman, serif');
    const prepared = prepareWithSegments(articleText, font);

    lines = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = contentTop;
    let safety = 0;

    while (safety < 500) {
      safety++;
      let availableWidth = textWidth;
      let xOffset = margin;
      let displaced = false;

      // Check all orbs
      for (const orb of orbs) {
        const check = isLineBlockedByOrb(y, orb, pad);
        if (check.blocked) {
          displaced = true;
          // Orb is on the right side
          if (check.left > textWidth / 2) {
            availableWidth = Math.max(60, check.left - margin);
          } else if (check.right < textWidth / 2) {
            // Orb on the left
            xOffset = Math.max(margin, check.right + margin);
            availableWidth = textWidth - (xOffset - margin);
          } else {
            // Orb in the middle - use left side
            availableWidth = Math.max(60, check.left - margin);
          }
        }
      }

      if (availableWidth < 30) { y += lineHeight; continue; }
      const line = layoutNextLine(prepared, cursor, availableWidth);
      if (!line) break;
      lines.push({ text: line.text, x: xOffset, y, lineWidth: line.width, displaced });
      cursor = line.end;
      y += lineHeight;
    }
    totalHeight = y;
  }

  function animateOrbs() {
    if (!orbsActive) return;
    const margin = 24;
    const textWidth = containerWidth - margin * 2;

    for (const orb of orbs) {
      orb.x += orb.vx;
      orb.y += orb.vy;

      // Bounce off walls
      if (orb.x - orb.radius < 0 || orb.x + orb.radius > textWidth) orb.vx *= -1;
      if (orb.y - orb.radius < 0 || orb.y + orb.radius > 400) orb.vy *= -1;

      orb.x = Math.max(orb.radius, Math.min(textWidth - orb.radius, orb.x));
      orb.y = Math.max(orb.radius, Math.min(400, orb.y));
    }

    orbs = [...orbs];
    computeLayout();
    animFrame = requestAnimationFrame(animateOrbs);
  }

  function toggleOrbs() {
    if (orbsActive) {
      orbsActive = false;
      cancelAnimationFrame(animFrame);
    } else {
      orbsActive = true;
      animateOrbs();
    }
  }

  onMount(() => {
    computeLayout();
    animateOrbs();
  });

  $effect(() => {
    const _cw = containerWidth;
    const _fs = fontSize;
    const _lh = lineHeight;
    const _sd = showDropCap;
    untrack(() => computeLayout());
  });
  onMount(() => { return () => { orbsActive = false; cancelAnimationFrame(animFrame); }; });
</script>

<div class="editorial-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Column <span>{containerWidth}px</span></label>
      <input type="range" min="450" max="900" bind:value={containerWidth} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="14" max="24" bind:value={fontSize} />
    </div>
    <div class="toggle-group">
      <button class:on={showDropCap} onclick={() => { showDropCap = !showDropCap; }}>Drop Cap</button>
      <button class:on={showGuides} onclick={() => showGuides = !showGuides}>Guides</button>
    </div>
    <div class="toggle-group">
      {#each (['dark', 'cream', 'newspaper'] as const) as t}
        <button class:on={theme === t} onclick={() => theme = t}>{t}</button>
      {/each}
    </div>
    <button class="orbit-btn" class:active={orbsActive} onclick={toggleOrbs}>
      {orbsActive ? '⏸ Pause orbs' : '▶ Animate orbs'}
    </button>
  </div>

  <div class="ed-stats">
    <span class="stat-pill">{lines.length} lines</span>
    <span class="stat-pill accent">{lines.filter(l => l.displaced).length} displaced by orbs</span>
    <span class="stat-pill">{orbs.length} floating obstacles</span>
  </div>

  <div
    class="editorial-canvas"
    style="
      width: 100%;
      min-height: {totalHeight + 40}px;
      background: {themes[theme].bg};
      color: {themes[theme].text};
    "
  >
    <!-- Header -->
    <div class="ed-header">
      <div class="ed-rule" style="background: {themes[theme].rule}"></div>
      <div class="ed-masthead">
        <span style="color: {themes[theme].muted}">FEATURE</span>
        <span style="color: {themes[theme].muted}">PRETEXT MINI-LAB</span>
      </div>
      <h2 class="ed-title" style="color: {themes[theme].text}">The Word Had Width</h2>
      <div class="ed-rule-thin" style="background: {themes[theme].muted}"></div>
    </div>

    <!-- Orb glows -->
    {#each orbs as orb}
      <div
        class="orb-glow"
        style="
          left: {orb.x - orb.radius * 2 + 24}px;
          top: {orb.y - orb.radius * 2 + contentTop}px;
          width: {orb.radius * 4}px;
          height: {orb.radius * 4}px;
          background: radial-gradient(ellipse, {orb.glowColor} 0%, transparent 70%);
        "
      ></div>
    {/each}

    <!-- Orbs -->
    {#each orbs as orb, i}
      <div
        class="orb"
        style="
          left: {orb.x - orb.radius + 24}px;
          top: {orb.y - orb.radius + contentTop}px;
          width: {orb.radius * 2}px;
          height: {orb.radius * 2}px;
          background: radial-gradient(circle at 35% 35%, {orb.color}44, {orb.color}11);
          border-color: {orb.color}66;
          box-shadow: 0 0 30px {orb.color}22, inset 0 0 20px {orb.color}11;
        "
      ></div>
    {/each}

    <!-- Line guides -->
    {#if showGuides}
      {#each lines as line}
        <div class="line-guide" style="top: {line.y}px; left: {line.x}px; width: {containerWidth - 48}px; border-color: {themes[theme].muted}22;"></div>
      {/each}
    {/if}

    <!-- Text lines -->
    {#each lines as line, i}
      <div
        class="ed-line"
        class:displaced={line.displaced}
        style="
          left: {line.x}px;
          top: {line.y}px;
          font-size: {fontSize}px;
          line-height: {lineHeight}px;
          font-family: Georgia, 'Times New Roman', serif;
          color: {line.displaced ? (theme === 'dark' ? '#c4b5fd' : themes[theme].text) : themes[theme].text};
        "
      >
        {#if showDropCap && i === 0}
          <span class="drop-cap" style="font-size: {fontSize * 4}px; line-height: {lineHeight * 3}px; color: {orbs[0].color};">{line.text[0]}</span>{line.text.slice(1)}
        {:else}
          {line.text}
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .editorial-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .toggle-group { display: flex; gap: 3px; }
  .toggle-group button, .orbit-btn {
    padding: 5px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); font-size: 0.72rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    text-transform: capitalize; transition: all var(--transition-fast);
  }
  .toggle-group button.on, .orbit-btn.active {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }

  .ed-stats {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .editorial-canvas {
    position: relative;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    max-width: 100%;
    transition: background 0.4s;
    box-shadow: 0 8px 40px rgba(0,0,0,0.25);
  }

  .ed-header { padding: 16px 24px 0; }
  .ed-rule { height: 4px; margin-bottom: 8px; }
  .ed-masthead {
    display: flex; justify-content: space-between; margin-bottom: 10px;
    font-size: 0.6rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
    font-family: var(--font-body);
  }
  .ed-title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 2rem; font-weight: 700; line-height: 1.15;
    margin-bottom: 10px; letter-spacing: -0.02em;
  }
  .ed-rule-thin { height: 1px; }

  .orb-glow {
    position: absolute; pointer-events: none; filter: blur(16px);
  }

  .orb {
    position: absolute; border-radius: 50%;
    border: 1px solid;
    pointer-events: none;
    backdrop-filter: blur(4px);
  }

  .line-guide {
    position: absolute; height: 1px; border-bottom: 1px dashed; pointer-events: none;
  }

  .ed-line {
    position: absolute;
    white-space: nowrap;
    pointer-events: none;
    transition: color 0.2s;
  }

  .drop-cap {
    float: left;
    font-weight: 700;
    margin-right: 6px;
    line-height: 1;
    font-family: Georgia, serif;
  }
</style>
