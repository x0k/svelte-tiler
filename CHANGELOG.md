# svelte-tiler

## 0.5.0

### Minor Changes

- [BREAKING] Fix typo `registerHandel` -> `registerHandle` ([`d2d6a07`](https://github.com/x0k/svelte-tiler/commit/d2d6a0704126ff47705b1cdabcac19d292605246))

### Patch Changes

- Fix unsubscribing from events when using `draggable.registerHandle` ([`35c3168`](https://github.com/x0k/svelte-tiler/commit/35c3168ab929392906986067f4090275c3d56694))

## 0.4.0

### Minor Changes

- [#10](https://github.com/x0k/svelte-tiler/pull/10) [`3b35707`](https://github.com/x0k/svelte-tiler/commit/3b35707a9f8ea810b2a2406e76dce2e80a98cab7) Thanks [@x0k](https://github.com/x0k)! - Allow to customize tabs edge ratio

- [#14](https://github.com/x0k/svelte-tiler/pull/14) [`6c982f9`](https://github.com/x0k/svelte-tiler/commit/6c982f92751a3e96e73231ae117ecd2c0cec3666) Thanks [@x0k](https://github.com/x0k)! - Expose `getTileById` tiler context method

- [#12](https://github.com/x0k/svelte-tiler/pull/12) [`c6beb86`](https://github.com/x0k/svelte-tiler/commit/c6beb86453037df508242b140a74fdcdb3defba7) Thanks [@x0k](https://github.com/x0k)! - Extend `SplitAPI`, provide `SplitItemAPI` via context

- [#12](https://github.com/x0k/svelte-tiler/pull/12) [`c6beb86`](https://github.com/x0k/svelte-tiler/commit/c6beb86453037df508242b140a74fdcdb3defba7) Thanks [@x0k](https://github.com/x0k)! - [BREAKING] Remove `expand` method from `split` tile.

  Use `restore` or `minimize` instead.

- [#14](https://github.com/x0k/svelte-tiler/pull/14) [`6c982f9`](https://github.com/x0k/svelte-tiler/commit/6c982f92751a3e96e73231ae117ecd2c0cec3666) Thanks [@x0k](https://github.com/x0k)! - [BREAKING] Remove `effects` tiler context option

- [#13](https://github.com/x0k/svelte-tiler/pull/13) [`2a8ea23`](https://github.com/x0k/svelte-tiler/commit/2a8ea23153bf39e74ec9f56b69ccf5fec9964c44) Thanks [@x0k](https://github.com/x0k)! - [BREAKING] Change the tab header signature to `Snippet<[HTMLAttributes<HTMLElement>, Tiles['tabs'], number, Draggable<Tile>]>`

  Now the root element must be rendered in the snippet, example:

  ```svelte
  {#snippet myTabHeader(props: HTMLAttributes<HTMLElement>, t: Tiles['tabs'], i: number)}
    <div {...props}>
      {t.titles[i]}
    </div>
  {/snippet}
  ```

### Patch Changes

- [`f088a11`](https://github.com/x0k/svelte-tiler/commit/f088a1130a147b2229198eb460e9baf2ce1c0618) Thanks [@x0k](https://github.com/x0k)! - Fix required `svelte` version.

  Version `5.40.0` is required due to the use of the `createContext` API.

- [`1ebd363`](https://github.com/x0k/svelte-tiler/commit/1ebd363fc9cb07d40bfc63519b7c89d30c44bd28) Thanks [@x0k](https://github.com/x0k)! - Set `script: true` for Vite preprocessor.

  Issue: <https://github.com/sveltejs/svelte/issues/17657>

- [#15](https://github.com/x0k/svelte-tiler/pull/15) [`e6ce2e6`](https://github.com/x0k/svelte-tiler/commit/e6ce2e6d7d48245df9320c09a533b774d3970be4) Thanks [@x0k](https://github.com/x0k)! - Fix consistency of weights when removing split child elements

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
