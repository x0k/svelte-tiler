# svelte-tiler

## 0.3.0

### Minor Changes

- [#8](https://github.com/x0k/svelte-tiler/pull/8) [`0baadf0`](https://github.com/x0k/svelte-tiler/commit/0baadf09e23b0920afc1cb43cab6a401f4c6634a) Thanks [@x0k](https://github.com/x0k)! - Export `isCollapsed`, `collapse`, `expand` methods from `split` tile

- [#6](https://github.com/x0k/svelte-tiler/pull/6) [`dab89a1`](https://github.com/x0k/svelte-tiler/commit/dab89a1053a252a8589aa1509fca69c9c67f4378) Thanks [@x0k](https://github.com/x0k)! - Add `collapsedSize` constraint

- [#9](https://github.com/x0k/svelte-tiler/pull/9) [`8277d3c`](https://github.com/x0k/svelte-tiler/commit/8277d3c60d612b6afde2b65a4c5281f429d41957) Thanks [@x0k](https://github.com/x0k)! - Pass `index` and `parent` parameters to a leaf snippet

## 0.2.0

### Minor Changes

- [#4](https://github.com/x0k/svelte-tiler/pull/4) [`56a4a34`](https://github.com/x0k/svelte-tiler/commit/56a4a34a08f1341649acbc3001677f3a10eedcda) Thanks [@x0k](https://github.com/x0k)! - [BREAKING] Remove `createSplit` tabs option in favor of `applySplit: (options: SplitOptions) => void`.

  Now the function should modify the layout.

- [#4](https://github.com/x0k/svelte-tiler/pull/4) [`56a4a34`](https://github.com/x0k/svelte-tiler/commit/56a4a34a08f1341649acbc3001677f3a10eedcda) Thanks [@x0k](https://github.com/x0k)! - [BREAKING] Introduce `ctx.insertInto` method.

  Now tile also should export `onInsert` function.

- [#4](https://github.com/x0k/svelte-tiler/pull/4) [`56a4a34`](https://github.com/x0k/svelte-tiler/commit/56a4a34a08f1341649acbc3001677f3a10eedcda) Thanks [@x0k](https://github.com/x0k)! - [BREAKING] Remove the `bindable` modifier for the `parent` option of tiles

## 0.1.0

### Minor Changes

- [#2](https://github.com/x0k/svelte-tiler/pull/2) [`0d14fbd`](https://github.com/x0k/svelte-tiler/commit/0d14fbdb7c86a40367f28a21e541fded9b7a71a5) Thanks [@x0k](https://github.com/x0k)! - [BREAKING] Refactor `TilerContext` implementation

- [#2](https://github.com/x0k/svelte-tiler/pull/2) [`0d14fbd`](https://github.com/x0k/svelte-tiler/commit/0d14fbdb7c86a40367f28a21e541fded9b7a71a5) Thanks [@x0k](https://github.com/x0k)! - [BREAKING] Rename `TileDroppable` -> `TileDropTarget`, `tartgetTileId` -> `tileId`.

  Introduce `TileDragSource` class.

- [#2](https://github.com/x0k/svelte-tiler/pull/2) [`0d14fbd`](https://github.com/x0k/svelte-tiler/commit/0d14fbdb7c86a40367f28a21e541fded9b7a71a5) Thanks [@x0k](https://github.com/x0k)! - [BREAKING] Remove on clean logic from split tile

## 0.0.1

### Patch Changes

- [`a5f8295`](https://github.com/x0k/svelte-tiler/commit/a5f8295ade2ffe73ecdc7e68b6c4a643149c2ca3) Thanks [@x0k](https://github.com/x0k)! - Initial release.
