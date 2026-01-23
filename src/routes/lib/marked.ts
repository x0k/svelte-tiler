import { marked } from 'marked';

import ts from '@shikijs/langs/typescript';
import svelte from '@shikijs/langs/svelte';
import monokai from '@shikijs/themes/monokai';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const shiki = createHighlighterCoreSync({
	themes: [monokai],
	langs: [ts, svelte],
	engine: createJavaScriptRegexEngine()
});

marked.use({
	renderer: {
		code({ text, lang }) {
			console.log(lang);
			return shiki.codeToHtml(text, {
				lang: lang ?? 'text',
				theme: 'monokai'
			});
		}
	}
});

export { marked };
