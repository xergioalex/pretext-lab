<script lang="ts">
  import { prepare, layout, buildFont } from '../../lib/pretext';
  import { untrack } from 'svelte';

  const cardData = [
    { text: 'Short card.', color: '#7c6cf0' },
    { text: 'A medium card with more text to show height variation across the grid layout.', color: '#3ecf8e' },
    { text: 'This card has significantly more content to demonstrate how Pretext predicts exact height, enabling true masonry packing without any layout shift or DOM measurement.', color: '#f5a623' },
    { text: 'Brief.', color: '#ef4444' },
    { text: 'Programmable text layout means you can plan your grid before rendering. No hidden elements, no trial-and-error, no layout thrashing.', color: '#06b6d4' },
    { text: 'Cards in masonry grids need height prediction. Without it: layout shift and wasted space.', color: '#ec4899' },
    { text: 'Tiny.', color: '#8b5cf6' },
    { text: 'When you combine text measurement with a packing algorithm, you get layouts that are both dense and readable. The gap between design intent and implementation shrinks dramatically.', color: '#10b981' },
    { text: 'Another medium card for height distribution.', color: '#f59e0b' },
    { text: 'The real power is predictability. You know every dimension before paint.', color: '#6366f1' },
    { text: 'Text height is the hidden variable in card layout systems. Control it, control the grid.', color: '#14b8a6' },
    { text: 'One more card.', color: '#e11d48' },
    { text: 'Pretext makes virtualized masonry practical — you can compute positions for thousands of cards without rendering a single one.', color: '#7c3aed' },
    { text: 'Fast.', color: '#059669' },
    { text: 'Imagine a Pinterest-like feed where every card position is computed before any DOM element is created.', color: '#d946ef' },
  ];

  let columns = $state(4);
  let cardWidth = $state(240);
  let fontSize = $state(13);
  let gap = $state(12);
  let animateIn = $state(true);

  interface CardInfo {
    text: string;
    color: string;
    height: number;
    lineCount: number;
    col: number;
    top: number;
  }

  let cards: CardInfo[] = $state([]);
  let containerHeight = $state(0);

  function computeLayout() {
    const font = buildFont(fontSize);
    const lh = fontSize * 1.55;
    const innerPad = 20;

    const measured = cardData.map((d) => {
      const prepared = prepare(d.text, font);
      const result = layout(prepared, cardWidth - innerPad * 2, lh);
      return { ...d, height: result.height + innerPad * 2 + 8, lineCount: result.lineCount };
    });

    const colHeights = new Array(columns).fill(0);
    cards = measured.map((m) => {
      let minCol = 0;
      for (let c = 1; c < columns; c++) {
        if (colHeights[c] < colHeights[minCol]) minCol = c;
      }
      const top = colHeights[minCol];
      colHeights[minCol] += m.height + gap;
      return { ...m, col: minCol, top };
    });

    containerHeight = Math.max(...colHeights);
  }

  function shuffle() {
    animateIn = false;
    setTimeout(() => { animateIn = true; }, 50);
    cardData.sort(() => Math.random() - 0.5);
    computeLayout();
  }

  $effect(() => {
    const _c = columns;
    const _cw = cardWidth;
    const _fs = fontSize;
    const _g = gap;
    untrack(() => computeLayout());
  });
</script>

<div class="masonry-demo">
  <div class="controls-bar">
    <div class="ctrl">
      <label>Columns <span>{columns}</span></label>
      <input type="range" min="1" max="6" bind:value={columns} />
    </div>
    <div class="ctrl">
      <label>Card width <span>{cardWidth}px</span></label>
      <input type="range" min="140" max="350" bind:value={cardWidth} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="10" max="22" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Gap <span>{gap}px</span></label>
      <input type="range" min="4" max="24" bind:value={gap} />
    </div>
    <button class="shuffle-btn" onclick={shuffle}>Shuffle</button>
  </div>

  <div class="masonry-stats">
    <span>{cards.length} cards</span>
    <span>All heights computed with <code>prepare() + layout()</code> — zero DOM measurement</span>
  </div>

  <div class="masonry-scroll">
    <div
      class="masonry-container"
      style="height: {containerHeight}px; width: {columns * cardWidth + (columns - 1) * gap}px;"
    >
      {#each cards as card, i (card.text)}
        <div
          class="m-card"
          class:animate={animateIn}
          style="
            left: {card.col * (cardWidth + gap)}px;
            top: {card.top}px;
            width: {cardWidth}px;
            height: {card.height}px;
            font-size: {fontSize}px;
            line-height: {fontSize * 1.55}px;
            --card-color: {card.color};
            --card-delay: {i * 30}ms;
          "
        >
          <div class="m-card-accent" style="background: {card.color}"></div>
          <div class="m-card-body">
            <div class="m-card-text">{card.text}</div>
          </div>
          <div class="m-card-footer">
            <span class="m-lines" style="color: {card.color}">{card.lineCount}L</span>
            <span class="m-height">{card.height}px</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .masonry-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .shuffle-btn {
    padding: 6px 18px; border-radius: var(--radius-sm);
    border: 1px solid var(--accent); background: transparent;
    color: var(--accent); font-size: 0.78rem; font-weight: 700;
    cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .shuffle-btn:hover { background: var(--accent); color: #fff; }

  .masonry-stats {
    font-size: 0.78rem; color: var(--text-muted);
    display: flex; flex-wrap: wrap; gap: var(--space-md);
  }
  .masonry-stats code {
    font-size: 0.75rem; color: var(--accent); background: none; padding: 0;
  }

  .masonry-scroll {
    overflow-x: auto; padding-bottom: var(--space-sm);
  }

  .masonry-container {
    position: relative;
    margin: 0 auto;
  }

  .m-card {
    position: absolute;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                left 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                top 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.3s ease;
  }

  .m-card.animate {
    animation: cardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) var(--card-delay) both;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: scale(0.92) translateY(12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .m-card:hover {
    border-color: var(--card-color);
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }

  .m-card-accent {
    height: 3px;
    flex-shrink: 0;
  }

  .m-card-body {
    flex: 1;
    padding: 16px 20px 8px;
  }

  .m-card-text {
    color: var(--text-primary);
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .m-card-footer {
    padding: 6px 20px 12px;
    display: flex; justify-content: space-between;
    font-family: var(--font-mono); font-size: 0.62rem;
  }
  .m-lines { font-weight: 700; }
  .m-height { color: var(--text-muted); }
</style>
