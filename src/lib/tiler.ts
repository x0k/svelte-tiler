import type { Snippet } from 'svelte';

import type { Nodes, NodeType } from './model.ts';
import { TILER_NODE_SNIPPETS } from './internal.js';

type NodeSnippets = {
	[T in NodeType]: Snippet<[Nodes[T]]>;
};

export interface Tiler {
	[TILER_NODE_SNIPPETS]: NodeSnippets;
}

export interface TilerOptions {
	snippets: NodeSnippets;
}

export function createTiler(options: TilerOptions) {
	const tiler: Tiler = {
		get [TILER_NODE_SNIPPETS]() {
			return options.snippets;
		}
	};
	return tiler;
}

export function getNodeSnippet<T extends NodeType>(ctx: Tiler, node: Nodes[T]) {
	return ctx[TILER_NODE_SNIPPETS][node.type];
}
