import type {
  Program,
  ImportDeclaration,
  ImportSpecifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  Literal,
  Identifier,
} from 'estree';
import { walk } from 'zimmerframe';
import type { AST } from 'svelte/compiler';

interface TypedImportSpecifier extends ImportSpecifier {
  importKind?: 'type' | 'value';
}

interface TypedImportDeclaration extends ImportDeclaration {
  importKind?: 'type' | 'value';
}

interface CollectedSpecifier {
  type: 'ImportSpecifier' | 'ImportNamespaceSpecifier';
  imported?: Identifier;
  local: Identifier;
  importKind: 'type' | 'value';
}

export function transformTileImports(ast: Program): Program {
  const libImportSpecifiers: CollectedSpecifier[] = [];
  const nodesToRemove = new Set<ImportDeclaration>();
  let firstLibImportIndex = -1;

  walk<AST.SvelteNode, null>(ast, null, {
    ImportDeclaration(node: TypedImportDeclaration) {
      const source = (node.source as Literal).value as string;

      if (source.startsWith('$lib/shared/')) {
        const newSource = source
          .replace('$lib', 'svelte-tiler')
          .replace(/\.js$/, '');

        (node.source as Literal).value = newSource;
        if ((node.source as Literal).raw) {
          (node.source as Literal).raw = `'${newSource}'`;
        }
      } else if (source.startsWith('$lib/')) {
        if (firstLibImportIndex === -1) {
          firstLibImportIndex = ast.body.indexOf(node as any);
        }

        const isTypeImport = node.importKind === 'type';

        node.specifiers.forEach((spec) => {
          if (spec.type === 'ImportDefaultSpecifier') {
            const defaultSpec = spec as ImportDefaultSpecifier;
            libImportSpecifiers.push({
              type: 'ImportSpecifier',
              imported: {
                type: 'Identifier',
                name: defaultSpec.local.name,
              },
              local: {
                type: 'Identifier',
                name: defaultSpec.local.name,
              },
              importKind: isTypeImport ? 'type' : 'value',
            });
          } else if (spec.type === 'ImportSpecifier') {
            const namedSpec = spec as TypedImportSpecifier;
            libImportSpecifiers.push({
              type: 'ImportSpecifier',
              imported: namedSpec.imported as Identifier,
              local: namedSpec.local,
              importKind: isTypeImport
                ? 'type'
                : namedSpec.importKind || 'value',
            });
          } else if (spec.type === 'ImportNamespaceSpecifier') {
            const namespaceSpec = spec as ImportNamespaceSpecifier;
            libImportSpecifiers.push({
              type: 'ImportNamespaceSpecifier',
              local: namespaceSpec.local,
              importKind: isTypeImport ? 'type' : 'value',
            });
          }
        });

        nodesToRemove.add(node);
      }
    },
  });

  ast.body = ast.body.filter(
    (node) => !nodesToRemove.has(node as ImportDeclaration)
  );

  if (libImportSpecifiers.length > 0) {
    const typeSpecs: ImportSpecifier[] = [];
    const valueSpecs: (ImportSpecifier | ImportNamespaceSpecifier)[] = [];

    libImportSpecifiers.forEach((spec) => {
      const specifier: ImportSpecifier | ImportNamespaceSpecifier =
        spec.type === 'ImportNamespaceSpecifier'
          ? {
              type: 'ImportNamespaceSpecifier',
              local: spec.local,
            }
          : {
              type: 'ImportSpecifier',
              imported: spec.imported!,
              local: spec.local,
            };

      if (spec.importKind === 'type' && spec.type === 'ImportSpecifier') {
        typeSpecs.push({
          ...(specifier as ImportSpecifier),
          importKind: 'type',
        } as ImportSpecifier);
      } else {
        valueSpecs.push(specifier);
      }
    });

    const allSpecifiers = [...valueSpecs, ...typeSpecs];

    const combinedImport: ImportDeclaration = {
      type: 'ImportDeclaration',
      specifiers: allSpecifiers,
      attributes: [],
      source: {
        type: 'Literal',
        value: 'svelte-tiler',
        raw: "'svelte-tiler'",
      },
    };

    let insertIndex = firstLibImportIndex;

    let removedBefore = 0;
    for (let i = 0; i < firstLibImportIndex; i++) {
      if (nodesToRemove.has(ast.body[i] as ImportDeclaration)) {
        removedBefore++;
      }
    }
    insertIndex -= removedBefore;

    ast.body.splice(insertIndex, 0, combinedImport);
  }

  return ast;
}
