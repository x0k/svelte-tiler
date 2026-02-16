import type { Plugin } from 'vite';
import { readFile } from 'fs/promises';
import * as path from 'path';

import ts from '@shikijs/langs/typescript';
import svelte from '@shikijs/langs/svelte';
import monokai from '@shikijs/themes/monokai';
import shellscript from '@shikijs/langs/shellscript';
import json from '@shikijs/langs/json';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { marked } from 'marked';
import markedAlert from 'marked-alert';
import { parse, print } from 'svelte/compiler';
import { format } from 'prettier';

import { transformTileImports } from './transform-tile-imports.ts';

const prettierConfig = readFile(path.join(__dirname, '..', '.prettierrc')).then(
  (f) => JSON.parse(f.toString())
);

const shiki = createHighlighterCoreSync({
  themes: [monokai],
  langs: [ts, svelte, shellscript, json],
  engine: createJavaScriptRegexEngine(),
});

marked.use(markedAlert()).use({
  renderer: {
    code({ text, lang }) {
      return shiki.codeToHtml(text, {
        lang: lang ?? 'text',
        theme: 'monokai',
      });
    },
  },
});

export function shikiImport(): Plugin {
  const virtualModulePrefix = '\0shiki:';
  return {
    name: 'vite-plugin-shiki-import',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source.startsWith(virtualModulePrefix)) {
        return source;
      }
      if (source.endsWith('?shiki')) {
        const [sourcePath] = source.split('?');
        if (
          importer &&
          (sourcePath.startsWith('./') || sourcePath.startsWith('../'))
        ) {
          source = path.resolve(path.dirname(importer), sourcePath);
        }
        return `${virtualModulePrefix}${source}.shiki.js`;
      }
      return null;
    },
    async load(id) {
      if (!id.startsWith(virtualModulePrefix)) {
        return null;
      }
      const filePath = id.slice(virtualModulePrefix.length, -9);
      try {
        let code = await readFile(filePath, 'utf-8');
        const ext = filePath.split('.').pop();
        const langMap: Record<string, string> = {
          ts: 'typescript',
          svelte: 'svelte',
          json: 'json',
        };
        const lang = ext && langMap[ext];
        if (!lang) {
          throw new Error(`invalid lang detected: "${ext}"`);
        }
        if (lang === 'svelte' && filePath.includes('/src/examples/')) {
          code = fixImportsAndStyles(code);
        }
        // if (lang === 'svelte' && filePath.includes('/src/lib/tiles/')) {
        //   code = await fixTileImports(code);
        // }
        const highlighted = shiki.codeToHtml(code, {
          lang,
          theme: 'monokai',
        });
        return `export default ${JSON.stringify(highlighted)};`;
      } catch (error) {
        this.error(`Failed to highlight file: ${filePath}\n${error}`);
      }
    },
  };
}

export function exampleImport(): Plugin {
  const virtualModulePrefix = '\0example:';
  return {
    name: 'vite-plugin-example-import',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source.startsWith(virtualModulePrefix)) {
        return source;
      }
      if (source.endsWith('?example')) {
        const [sourcePath] = source.split('?');
        if (
          importer &&
          (sourcePath.startsWith('./') || sourcePath.startsWith('../'))
        ) {
          source = path.resolve(path.dirname(importer), sourcePath);
        }
        return `${virtualModulePrefix}${source}.example.js`;
      }
      return null;
    },
    async load(id) {
      if (!id.startsWith(virtualModulePrefix)) {
        return null;
      }
      const filePath = id.slice(virtualModulePrefix.length, -11);
      try {
        const content = await readFile(filePath, 'utf-8');
        const fixed = await (
          filePath.includes('lib/tiles/') ? fixTileImports : fixImportsAndStyles
        )(content);
        return `export default ${JSON.stringify(fixed)};`;
      } catch (error) {
        this.error(`Failed to fix example file: ${filePath}\n${error}`);
      }
    },
  };
}

export function markedImport(): Plugin {
  return {
    name: 'vite-plugin-marked-import',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith('?marked')) {
        return null;
      }
      const filePath = id.split('?')[0];
      try {
        const content = await readFile(filePath, 'utf-8');
        const parsed = await marked.parse(content);
        return `export default ${JSON.stringify(parsed)};`;
      } catch (error) {
        this.error(`Failed to highlight file: ${filePath}\n${error}`);
      }
    },
  };
}

function fixImportsAndStyles(code: string): string {
  return code
    .replaceAll('$lib', 'svelte-tiler')
    .replaceAll('/index.js', '')
    .replaceAll('.js', '')
    .replaceAll(':global .example', ':global');
}

async function fixTileImports(code: string): Promise<string> {
  const ast = parse(code, { modern: true });
  if (ast.module) {
    ast.module.content = transformTileImports(ast.module.content);
  }
  if (ast.instance) {
    ast.instance.content = transformTileImports(ast.instance.content);
  }
  const transformed = print(ast)
    .code.replace('../model.js', 'svelte-tiler')
    // TODO: It seems that the print statement is missing the keyword `module`.
    // Remove this line when the problem is fixed.
    .replace("declare 'svelte-tiler'", "declare module 'svelte-tiler'")
    // Svelte print is crazy
    .replaceAll(';}', '}')
    // WHY ARE YOU DOING THIS
    .replaceAll(/\[(\w+)\s+extends\s+keyof\s+([^\]]+)\]/g, '[$1 in keyof $2]');
  const config = await prettierConfig;
  return format(transformed, {
    ...config,
    parser: 'svelte',
  });
}
