import { marked } from 'marked';

import ts from '@shikijs/langs/typescript';
import svelte from '@shikijs/langs/svelte';
import monokai from '@shikijs/themes/monokai';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const languages = {
  ts,
  svelte,
};

export type Language = keyof typeof languages;

const shiki = createHighlighterCoreSync({
  themes: [monokai],
  langs: Object.values(languages),
  engine: createJavaScriptRegexEngine(),
});

marked.use({
  renderer: {
    code({ text, lang }) {
      return shiki.codeToHtml(text, {
        lang: lang ?? 'text',
        theme: 'monokai',
      });
    },
  },
});

export function markdownToHTML(text: string) {
  return marked.parse(text);
}

export function highlight(code: string, lang: Language) {
  return shiki.codeToHtml(code, { lang, theme: 'monokai' });
}
