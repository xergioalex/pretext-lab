<script lang="ts">
  import { prepare, layout, prepareWithSegments, layoutWithLines, buildFont } from '../../lib/pretext';
  import { untrack } from 'svelte';

  interface Sample {
    label: string;
    lang: string;
    text: string;
    note: string;
  }

  const samples: Sample[] = [
    {
      label: 'English',
      lang: 'en',
      text: 'The quick brown fox jumps over the lazy dog. Typography on the web has always been constrained by the DOM layout model.',
      note: 'Standard Latin script — baseline behavior.',
    },
    {
      label: 'Spanish',
      lang: 'es',
      text: 'El veloz murciélago hindú comía feliz cardillo y kiwi. La cigüeña tocaba el saxofón detrás del palenque de paja.',
      note: 'Latin with accented characters and special glyphs.',
    },
    {
      label: 'Chinese (Simplified)',
      lang: 'zh',
      text: '天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。寒来暑往，秋收冬藏。闰余成岁，律吕调阳。云腾致雨，露结为霜。',
      note: 'CJK characters — each character can be a break point.',
    },
    {
      label: 'Japanese',
      lang: 'ja',
      text: '吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。',
      note: 'Mixed Kanji, Hiragana, Katakana — kinsoku rules apply.',
    },
    {
      label: 'Arabic',
      lang: 'ar',
      text: 'في البدء كانت الكلمة، والكلمة كانت عند الله. النص العربي يكتب من اليمين إلى اليسار ويتطلب معالجة خاصة للاتجاه ثنائي الاتجاه.',
      note: 'RTL script — bidirectional text handling.',
    },
    {
      label: 'Mixed Bidi',
      lang: 'mixed',
      text: 'This sentence contains العربية mixed with English and 日本語 Japanese text, plus some números en español.',
      note: 'Multiple scripts and directions in one paragraph.',
    },
    {
      label: 'Emoji-heavy',
      lang: 'emoji',
      text: '🎨 Design is not just what it looks like 👀 and feels like 💫. Design is how it works ⚙️. Every pixel 🖼️ matters. Ship it 🚀!',
      note: 'Emoji grapheme clusters — complex width calculations.',
    },
    {
      label: 'Long unbroken string',
      lang: 'en',
      text: 'Supercalifragilisticexpialidocious_antidisestablishmentarianism_pneumonoultramicroscopicsilicovolcanoconiosis_floccinaucinihilipilification',
      note: 'No natural break points — tests overflow behavior.',
    },
    {
      label: 'Whitespace-heavy',
      lang: 'en',
      text: 'Word    with    multiple    spaces    between    each    token    to    test    whitespace    handling    in    the    layout    engine.',
      note: 'Multiple consecutive spaces — whitespace mode matters.',
    },
  ];

  let width = $state(400);
  let fontSize = $state(16);

  interface SampleResult {
    sample: Sample;
    height: number;
    lineCount: number;
    lines: Array<{ text: string; width: number }>;
  }

  let results: SampleResult[] = $state([]);

  function computeAll() {
    const font = buildFont(fontSize);
    const lh = fontSize * 1.6;

    results = samples.map((sample) => {
      const prepared = prepareWithSegments(sample.text, font);
      const result = layoutWithLines(prepared, width, lh);
      return {
        sample,
        height: result.height,
        lineCount: result.lineCount,
        lines: result.lines.map((l) => ({ text: l.text, width: Math.round(l.width) })),
      };
    });
  }

  $effect(() => {
    const _w = width;
    const _fs = fontSize;
    untrack(() => computeAll());
  });
</script>

<div class="i18n-demo">
  <div class="demo-controls">
    <div class="control-group" style="flex: 1;">
      <label class="control-label" for="i18n-width">Width: <span class="control-value">{width}px</span></label>
      <input id="i18n-width" type="range" min="150" max="700" bind:value={width} />
    </div>
    <div class="control-group">
      <label class="control-label" for="i18n-font">Font size: <span class="control-value">{fontSize}px</span></label>
      <input id="i18n-font" type="range" min="12" max="28" bind:value={fontSize} />
    </div>
  </div>

  <div class="samples-grid">
    {#each results as r}
      <div class="sample-card">
        <div class="sample-header">
          <h3>{r.sample.label}</h3>
          <div class="sample-stats">
            {r.lineCount} lines · {r.height}px
          </div>
        </div>
        <p class="sample-note">{r.sample.note}</p>
        <div
          class="sample-text"
          style="
            max-width: {width}px;
            font-size: {fontSize}px;
            line-height: {fontSize * 1.6}px;
            direction: {r.sample.lang === 'ar' ? 'rtl' : 'ltr'};
          "
        >
          {r.sample.text}
        </div>
        <div class="sample-lines">
          {#each r.lines as line, i}
            <div class="line-info">
              <span class="line-num">{i + 1}</span>
              <span class="line-text">{line.text || '(empty)'}</span>
              <span class="line-width">{line.width}px</span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="honesty-note">
    <p>
      <strong>Honest assessment:</strong> Text layout is globally complex. Pretext handles many Unicode edge cases,
      including CJK line breaking (kinsoku), grapheme clusters, and bidirectional text. However, perfect rendering
      across all scripts, browsers, and font combinations remains an ongoing challenge for any text layout system.
      These samples show both Pretext's strengths and the inherent complexity of multilingual text.
    </p>
  </div>
</div>

<style>
  .i18n-demo {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  .samples-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  .sample-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
  }

  .sample-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-sm);
  }

  .sample-header h3 {
    font-size: 1rem;
    color: var(--accent);
  }

  .sample-stats {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .sample-note {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: var(--space-md);
    font-style: italic;
  }

  .sample-text {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    color: var(--text-primary);
    margin-bottom: var(--space-md);
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .sample-lines {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .line-info {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 0.75rem;
    padding: 2px var(--space-sm);
    border-radius: 2px;
  }

  .line-info:hover {
    background: var(--bg-card);
  }

  .line-num {
    font-family: var(--font-mono);
    color: var(--text-muted);
    width: 20px;
    text-align: right;
    flex-shrink: 0;
  }

  .line-text {
    color: var(--text-secondary);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .line-width {
    font-family: var(--font-mono);
    color: var(--accent);
    flex-shrink: 0;
  }

  .honesty-note {
    background: var(--bg-card);
    border: 1px solid var(--border-accent);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
  }

  .honesty-note p {
    font-size: 0.88rem;
    color: var(--text-secondary);
    line-height: 1.7;
  }
</style>
