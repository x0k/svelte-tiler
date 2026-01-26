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

function parseTree(files: Record<string, any>): TreeNode[] {
  const root: FolderNode = {
    type: 'folder',
    name: '',
    children: [],
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
          path: fullPath,
        });
      } else if (part === '.') {
        continue;
      } else {
        let folder = current.children.find(
          (n): n is FolderNode => n.type === 'folder' && n.name === part
        );

        if (!folder) {
          folder = {
            type: 'folder',
            name: part,
            children: [],
          };
          current.children.push(folder);
        }

        current = folder;
      }
    }
  }

  return root.children;
}

const ORDER: Record<TreeNode['type'], number> = {
  file: 0,
  folder: 1,
};

function sortTree(tree: TreeNode[]): TreeNode[] {
  return tree
    .map((n) =>
      n.type === 'folder' ? { ...n, children: sortTree(n.children) } : n
    )
    .sort((a, b) => {
      const d = ORDER[b.type] - ORDER[a.type];
      if (d !== 0) {
        return d;
      }
      return a.name.localeCompare(b.name);
    });
}

export function buildTree(files: Record<string, any>) {
  return sortTree(parseTree(files));
}

export function getFileExtension(filename: string) {
  const index = filename.lastIndexOf('.');
  return filename.slice(index + 1);
}
