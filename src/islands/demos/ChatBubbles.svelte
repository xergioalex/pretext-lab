<script lang="ts">
  import { prepare, layout, buildFont } from '../../lib/pretext';
  import { onMount, untrack } from 'svelte';

  const conversationTexts = [
    { text: 'Hey, have you seen the new Pretext library?', sender: 'other' as const },
    { text: 'Not yet! What does it do?', sender: 'user' as const },
    { text: 'It turns text layout into a programmable primitive. You prepare the text once and then you can compute its layout at any width instantly.', sender: 'other' as const },
    { text: 'So no more hidden divs for measurement?', sender: 'user' as const },
    { text: 'Exactly. The prepare step does Unicode analysis and font measurement once. After that, layout at any width is pure arithmetic.', sender: 'other' as const },
    { text: 'That sounds perfect for chat bubbles!', sender: 'user' as const },
    { text: 'Yes! And for virtualized lists, resizable panels, and anything where you need to predict dimensions.', sender: 'other' as const },
    { text: 'Nice. I should try it.', sender: 'user' as const },
    { text: 'The API is really clean: prepare(text, font) then layout(prepared, width, lineHeight)', sender: 'other' as const },
    { text: 'Simple. I like it.', sender: 'user' as const },
  ];

  interface Message {
    id: number;
    text: string;
    sender: 'user' | 'other';
    height: number;
    lineCount: number;
    time: string;
  }

  let wrapperWidth = $state(0);
  let containerWidth = $state(480);
  let fontSize = $state(14);
  let newMessageText = $state('');
  let messages: Message[] = $state([]);
  let nextId = $state(0);
  let autoPlaying = $state(false);
  let autoInterval: ReturnType<typeof setInterval> | null = null;

  const maxBubbleRatio = 0.75;

  function getTime(): string {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  function computeMsg(text: string, sender: 'user' | 'other'): Message {
    const font = buildFont(fontSize);
    const lh = fontSize * 1.5;
    const bubbleMax = containerWidth * maxBubbleRatio - 28;
    const prepared = prepare(text, font);
    const result = layout(prepared, bubbleMax, lh);
    return { id: nextId++, text, sender, height: result.height + 24, lineCount: result.lineCount, time: getTime() };
  }

  function initMessages() {
    messages = conversationTexts.map((m) => computeMsg(m.text, m.sender));
  }

  function relayoutAll() {
    const font = buildFont(fontSize);
    const lh = fontSize * 1.5;
    const bubbleMax = containerWidth * maxBubbleRatio - 28;
    messages = messages.map((m) => {
      const prepared = prepare(m.text, font);
      const result = layout(prepared, bubbleMax, lh);
      return { ...m, height: result.height + 24, lineCount: result.lineCount };
    });
  }

  function addMessage() {
    if (!newMessageText.trim()) return;
    messages = [...messages, computeMsg(newMessageText.trim(), 'user')];
    newMessageText = '';
    // Scroll to bottom
    setTimeout(() => {
      const el = document.querySelector('.chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addMessage(); }
  }

  const autoMessages = [
    'This message was added automatically!',
    'Pretext computed this bubble size before rendering.',
    'No DOM measurement needed for this bubble.',
    'Try resizing the container width!',
    'Each bubble is sized with pure arithmetic.',
    'prepare() once, layout() at any width.',
  ];
  let autoIdx = $state(0);

  function startAutoPlay() {
    autoPlaying = true;
    autoInterval = setInterval(() => {
      const sender = autoIdx % 2 === 0 ? 'other' : 'user';
      messages = [...messages, computeMsg(autoMessages[autoIdx % autoMessages.length], sender as 'user' | 'other')];
      autoIdx++;
      setTimeout(() => {
        const el = document.querySelector('.chat-messages');
        if (el) el.scrollTop = el.scrollHeight;
      }, 50);
    }, 1200);
  }

  function stopAutoPlay() {
    autoPlaying = false;
    if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
  }

  $effect(() => {
    const _fs = fontSize;
    untrack(() => initMessages());
  });
  $effect(() => {
    const _cw = containerWidth;
    untrack(() => { if (messages.length > 0) relayoutAll(); });
  });
  onMount(() => { startAutoPlay(); return () => stopAutoPlay(); });
</script>

<div class="chat-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl" style="flex: 1;">
      <label>Container <span>{containerWidth}px</span></label>
      <input type="range" min="250" max={wrapperWidth || 600} bind:value={containerWidth} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="11" max="20" bind:value={fontSize} />
    </div>
    <button
      class="auto-btn"
      class:playing={autoPlaying}
      onclick={() => autoPlaying ? stopAutoPlay() : startAutoPlay()}
    >
      {autoPlaying ? '⏸ Stop' : '▶ Simulate messages'}
    </button>
  </div>

  <div class="chat-window" style="max-width: {containerWidth}px; font-size: {fontSize}px;">
    <div class="chat-header">
      <div class="header-left">
        <div class="avatar">P</div>
        <div>
          <div class="chat-name">Pretext Dev</div>
          <div class="chat-status">
            {autoPlaying ? 'Typing...' : 'Online'}
          </div>
        </div>
      </div>
      <div class="msg-count">{messages.length} msgs</div>
    </div>

    <div class="chat-messages">
      {#each messages as msg, i (msg.id)}
        <div
          class="msg-row"
          class:outgoing={msg.sender === 'user'}
          style="animation-delay: {Math.max(0, i - conversationTexts.length + 1) * 60}ms"
        >
          {#if msg.sender === 'other'}
            <div class="msg-avatar">P</div>
          {/if}
          <div class="bubble-wrapper">
            <div
              class="bubble"
              class:bubble-user={msg.sender === 'user'}
              class:bubble-other={msg.sender === 'other'}
              style="max-width: {containerWidth * maxBubbleRatio}px; line-height: {fontSize * 1.5}px;"
            >
              {msg.text}
            </div>
            <div class="bubble-info" class:right={msg.sender === 'user'}>
              <span class="bubble-time">{msg.time}</span>
              <span class="bubble-size">{msg.lineCount}L · {msg.height}px</span>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="chat-input">
      <input
        type="text"
        placeholder="Type a message..."
        bind:value={newMessageText}
        onkeydown={handleKeydown}
      />
      <button class="send-btn" onclick={addMessage}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
      </button>
    </div>
  </div>
</div>

<style>
  .chat-demo { display: flex; flex-direction: column; gap: var(--space-md); }

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

  .chat-window {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin: 0 auto;
    transition: max-width 0.2s ease;
    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  }

  .chat-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid var(--border);
    background: var(--bg-card);
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .avatar, .msg-avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: var(--accent); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 0.85rem; flex-shrink: 0;
  }
  .msg-avatar { width: 28px; height: 28px; font-size: 0.7rem; }
  .chat-name { font-size: 0.88rem; font-weight: 600; }
  .chat-status { font-size: 0.68rem; color: var(--success); }
  .msg-count {
    font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);
    background: var(--bg-surface); padding: 3px 8px; border-radius: 9999px;
  }

  .chat-messages {
    padding: 16px;
    display: flex; flex-direction: column; gap: 6px;
    max-height: 480px; overflow-y: auto;
  }

  .msg-row {
    display: flex; align-items: flex-end; gap: 8px;
    animation: msgIn 0.25s ease both;
  }
  .msg-row.outgoing { justify-content: flex-end; }

  @keyframes msgIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .bubble-wrapper { max-width: 75%; }

  .bubble {
    padding: 10px 14px; border-radius: 18px;
    word-wrap: break-word; overflow-wrap: break-word;
  }
  .bubble-other {
    background: var(--bg-card); border: 1px solid var(--border);
    border-bottom-left-radius: 6px; color: var(--text-primary);
  }
  .bubble-user {
    background: var(--accent); color: #fff;
    border-bottom-right-radius: 6px;
  }

  .bubble-info {
    display: flex; gap: 8px; padding: 2px 6px;
    font-size: 0.58rem; color: var(--text-muted);
  }
  .bubble-info.right { justify-content: flex-end; }
  .bubble-time { }
  .bubble-size { font-family: var(--font-mono); color: var(--accent); opacity: 0.6; }

  .chat-input {
    display: flex; gap: 8px; padding: 12px 16px;
    border-top: 1px solid var(--border); background: var(--bg-card);
  }
  .chat-input input { flex: 1; border-radius: 20px; padding: 8px 16px; }
  .send-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--accent); color: #fff; border: none;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all var(--transition-fast); flex-shrink: 0;
  }
  .send-btn:hover { transform: scale(1.1); }
</style>
