export type FileNode = {
	type: 'file';
	name: string;
	path: string;
};

export type FolderNode = {
	type: 'folder';
	name: string;
	children: TreeNode[];
};

export type TreeNode = FileNode | FolderNode;

export function buildTree(files: Record<string, string>): TreeNode[] {
	const root: FolderNode = {
		type: 'folder',
		name: '',
		children: []
	};

	for (const fullPath of Object.keys(files)) {
		const parts = fullPath.split('/');
		let current = root;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			const isFile = i === parts.length - 1;

			if (isFile) {
				current.children.push({
					type: 'file',
					name: part,
					path: fullPath
				});
			} else {
				let folder = current.children.find(
					(n): n is FolderNode => n.type === 'folder' && n.name === part
				);

				if (!folder) {
					folder = {
						type: 'folder',
						name: part,
						children: []
					};
					current.children.push(folder);
				}

				current = folder;
			}
		}
	}

	return root.children;
}
