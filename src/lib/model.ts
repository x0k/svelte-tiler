import type { Snippet } from 'svelte';

export interface AbstractNode<T extends NodeType> {
	id: string;
	type: T;
}

export interface ContainerNode {
	children: Node[];
	weights: number[];
}

export interface RenderNode {
	render: Snippet;
}

export interface NodeRegistry {
	hsplit: ContainerNode;
	vsplit: ContainerNode;
	render: RenderNode;
}

export type NodeType = keyof NodeRegistry;

export type Nodes = {
	[T in NodeType]: AbstractNode<T> & NodeRegistry[T];
}

export type Node = Nodes[NodeType]
