<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const paragraph = 'Typography on the web has always been constrained by the DOM layout model. Every time you need to know how tall a paragraph will be at a given width you have to render it read the computed height and hope nothing triggers an expensive reflow. Pretext changes this equation entirely. By separating text analysis from layout computation it lets you treat text dimensions as pure functions. Give it a width get back a height and line count instantly. This seemingly simple shift enables entirely new categories of UI from text-aware masonry grids to editorial layouts with flowing content around arbitrary shapes.';

  let canvas: HTMLCanvasElement;
  let wrapperWidth = $state(0);
  let canvasWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 800);
  const canvasHeight = 600;

  // Game state
  let gameState = $state<'ready' | 'playing' | 'won'>('ready');
  let score = $state(0);
  let ballSpeed = 4;

  // Ball
  let ballX = $state(400);
  let ballY = $state(520);
  let ballVX = $state(3);
  let ballVY = $state(-4);
  const ballR = 6;

  // Paddle
  let paddleX = $state(350);
  const paddleW = 100;
  const paddleH = 12;
  const paddleY = 560;

  // Bricks (words)
  interface Brick {
    word: string;
    x: number;
    y: number;
    w: number;
    h: number;
    alive: boolean;
    color: string;
  }

  let bricks: Brick[] = $state([]);
  let animFrame = 0;
  let mouseX = $state(400);

  const colors = ['#7c6cf0', '#3ecf8e', '#f5a623', '#06b6d4', '#ec4899', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#6366f1'];

  function initBricks() {
    const font = buildFont(14, 'Inter, sans-serif');
    const lh = 22;
    const margin = 20;
    const maxW = canvasWidth - margin * 2;

    // Split paragraph into words
    const words = paragraph.split(' ');

    // Use Pretext to layout words as lines, then extract word positions
    const prepared = prepareWithSegments(paragraph, font);
    const result = layoutWithLines(prepared, maxW, lh);

    bricks = [];
    let charPos = 0;

    for (let li = 0; li < result.lines.length; li++) {
      const line = result.lines[li];
      const lineWords = line.text.trim().split(/\s+/);
      const y = margin + li * (lh + 4);

      // Measure each word to get its width
      let xOffset = margin;
      for (let wi = 0; wi < lineWords.length; wi++) {
        const word = lineWords[wi];
        if (!word) continue;

        // Measure word width using canvas
        const wordPrepared = prepareWithSegments(word, font);
        const wordLayout = layoutWithLines(wordPrepared, 9999, lh);
        const wordW = wordLayout.lines[0]?.width ?? 40;

        bricks.push({
          word,
          x: xOffset,
          y,
          w: wordW + 8,
          h: lh,
          alive: true,
          color: colors[(li + wi) % colors.length],
        });

        xOffset += wordW + 12; // word width + space
      }
    }
  }

  function resetBall() {
    ballX = canvasWidth / 2;
    ballY = 520;
    ballVX = (Math.random() - 0.5) * 6;
    ballVY = -ballSpeed;
  }

  function startGame() {
    gameState = 'playing';
    score = 0;
    initBricks();
    resetBall();
    tick();
  }

  function tick() {
    if (gameState !== 'playing') return;

    // Move paddle toward mouse
    paddleX = Math.max(0, Math.min(canvasWidth - paddleW, mouseX - paddleW / 2));

    // Move ball
    ballX += ballVX;
    ballY += ballVY;

    // Wall collisions
    if (ballX - ballR <= 0 || ballX + ballR >= canvasWidth) ballVX *= -1;
    if (ballY - ballR <= 0) ballVY *= -1;

    // Ball falls below paddle — reset
    if (ballY > canvasHeight) {
      resetBall();
    }

    // Paddle collision
    if (
      ballY + ballR >= paddleY &&
      ballY + ballR <= paddleY + paddleH + 8 &&
      ballX >= paddleX &&
      ballX <= paddleX + paddleW
    ) {
      ballVY = -Math.abs(ballVY);
      // Add spin based on where ball hits paddle
      const hitPos = (ballX - paddleX) / paddleW - 0.5;
      ballVX = hitPos * 8;
    }

    // Brick collisions
    for (const brick of bricks) {
      if (!brick.alive) continue;
      if (
        ballX + ballR >= brick.x &&
        ballX - ballR <= brick.x + brick.w &&
        ballY + ballR >= brick.y &&
        ballY - ballR <= brick.y + brick.h
      ) {
        brick.alive = false;
        ballVY *= -1;
        score++;

        // Now relayout surviving text
        relayoutBricks();
        break;
      }
    }

    // Check win
    if (bricks.every((b) => !b.alive)) {
      gameState = 'won';
    }

    render();
    animFrame = requestAnimationFrame(tick);
  }

  function relayoutBricks() {
    // Gather surviving words and re-layout them
    const survivingWords = bricks.filter((b) => b.alive).map((b) => b.word);
    if (survivingWords.length === 0) return;

    const text = survivingWords.join(' ');
    const font = buildFont(14, 'Inter, sans-serif');
    const lh = 22;
    const margin = 20;
    const maxW = canvasWidth - margin * 2;

    const prepared = prepareWithSegments(text, font);
    const result = layoutWithLines(prepared, maxW, lh);

    // Rebuild bricks from relayouted text
    const newBricks: Brick[] = [];
    let wordIdx = 0;

    for (let li = 0; li < result.lines.length; li++) {
      const line = result.lines[li];
      const lineWords = line.text.trim().split(/\s+/);
      const y = margin + li * (lh + 4);
      let xOffset = margin;

      for (const word of lineWords) {
        if (!word) continue;
        const wordPrepared = prepareWithSegments(word, font);
        const wordLayout = layoutWithLines(wordPrepared, 9999, lh);
        const wordW = wordLayout.lines[0]?.width ?? 40;

        // Find matching old brick for color
        const oldBrick = bricks.find((b) => b.alive && b.word === word && !newBricks.some((nb) => nb === b));
        const color = oldBrick?.color ?? colors[wordIdx % colors.length];

        newBricks.push({
          word,
          x: xOffset,
          y,
          w: wordW + 8,
          h: lh,
          alive: true,
          color,
        });

        xOffset += wordW + 12;
        wordIdx++;
      }
    }

    bricks = newBricks;
  }

  function render() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.scale(dpr, dpr);

    // Background
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    ctx.fillStyle = isDark ? '#08080e' : '#f5f5fa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Bricks
    const textColor = isDark ? '#fff' : '#fff';
    for (const brick of bricks) {
      if (!brick.alive) continue;
      // Brick bg
      ctx.fillStyle = brick.color;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 4);
      ctx.fill();

      // Word text
      ctx.fillStyle = textColor;
      ctx.font = '13px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(brick.word, brick.x + 4, brick.y + brick.h / 2);
    }

    // Paddle
    ctx.fillStyle = isDark ? '#e8e8ed' : '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(paddleX, paddleY, paddleW, paddleH, 6);
    ctx.fill();

    // Ball
    ctx.fillStyle = '#7c6cf0';
    ctx.shadowColor = '#7c6cf0';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Score
    ctx.fillStyle = isDark ? '#5c5c6e' : '#8888a0';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Score: ${score}`, 20, canvasHeight - 10);

    const totalBricks = bricks.length + score;
    ctx.fillText(`${bricks.filter((b) => b.alive).length} words remaining`, canvasWidth - 220, canvasHeight - 10);

    // Ready / Won overlay
    if (gameState === 'ready') {
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = isDark ? '#e8e8ed' : '#111';
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Text Breakout', canvasWidth / 2, canvasHeight / 2 - 30);
      ctx.font = '16px Inter, sans-serif';
      ctx.fillStyle = isDark ? '#9898a8' : '#555';
      ctx.fillText('Click to start — smash words, watch text reflow', canvasWidth / 2, canvasHeight / 2 + 10);
      ctx.textAlign = 'left';
    }

    if (gameState === 'won') {
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = '#3ecf8e';
      ctx.font = 'bold 32px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('All words destroyed!', canvasWidth / 2, canvasHeight / 2 - 20);
      ctx.font = '16px Inter, sans-serif';
      ctx.fillStyle = isDark ? '#9898a8' : '#555';
      ctx.fillText(`Score: ${score} — Click to play again`, canvasWidth / 2, canvasHeight / 2 + 20);
      ctx.textAlign = 'left';
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
  }

  function handleClick() {
    if (gameState !== 'playing') {
      startGame();
    }
  }

  onMount(() => {
    initBricks();
    render();
    return () => cancelAnimationFrame(animFrame);
  });
</script>

<div class="breakout-demo" bind:clientWidth={wrapperWidth}>
  <div class="breakout-info">
    <span class="stat-pill">Score: <strong>{score}</strong></span>
    <span class="stat-pill accent">{bricks.filter(b => b.alive).length} words left</span>
    <span class="stat-pill">Destroyed words reflow via <code>layoutWithLines()</code></span>
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="canvas-wrap" onmousemove={handleMouseMove} onclick={handleClick}>
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .breakout-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .breakout-info { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }
  .stat-pill code { font-size: 0.72rem; color: var(--accent); background: none; padding: 0; }
  .stat-pill strong { color: var(--accent); }

  .canvas-wrap {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: none;
    box-shadow: 0 8px 40px rgba(0,0,0,0.2);
  }
  canvas { display: block; width: 100%; }
</style>
