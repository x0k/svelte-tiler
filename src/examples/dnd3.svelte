<script lang="ts">
  import {
    createDnd,
    createDraggable,
    createDroppable,
    drag,
    drop,
    ghost,
    isDragged,
    isOver,
    pointerSensor,
    autoscroll,
    type Draggable,
  } from '$lib/dnd3/index.js';

  interface Item {
    id: string;
    label: string;
  }

  type ColumnId = 'a' | 'b';

  const columnIds: ColumnId[] = ['a', 'b'];

  let portalEl: HTMLDivElement;

  const dnd = createDnd<Item>({
    plugins: [
      pointerSensor(),
      ghost({ portalTo: () => portalEl }),
      autoscroll(),
    ],
  });

  let columns = $state<Record<ColumnId, Item[]>>({
    a: [
      { id: '1', label: 'Foo' },
      { id: '2', label: 'Bar' },
      { id: '3', label: 'Baz' },
    ],
    b: [{ id: '4', label: 'Qux' }],
  });

  function findItem(id: string): { item: Item; column: ColumnId } | undefined {
    for (const column of ['a', 'b'] as ColumnId[]) {
      const item = columns[column].find((item) => item.id === id);
      if (item) return { item, column };
    }
    return undefined;
  }

  function moveTo(id: string, to: ColumnId) {
    const found = findItem(id);
    if (!found) return;
    columns[found.column] = columns[found.column].filter(
      (item) => item.id !== id
    );
    columns[to] = [...columns[to], found.item];
  }

  function createColumnDroppable(column: ColumnId) {
    return createDroppable(dnd, {
      id: `column-${column}`,
      onDrop(_data, draggable) {
        moveTo(draggable.id, column);
      },
    });
  }

  const droppables: Record<
    ColumnId,
    ReturnType<typeof createColumnDroppable>
  > = {
    a: createColumnDroppable('a'),
    b: createColumnDroppable('b'),
  };

  const draggables = new Map<string, Draggable<Item>>();

  function draggableFor(item: Item): Draggable<Item> {
    let draggable = draggables.get(item.id);
    if (!draggable) {
      draggable = createDraggable(dnd, {
        id: item.id,
        data: () => findItem(item.id)?.item,
      });
      draggables.set(item.id, draggable);
    }
    return draggable;
  }
</script>

<div class="board" bind:this={portalEl}>
  {#each columnIds as column, i (column)}
    {@const droppable = droppables[column]}
    <div
      class="column"
      class:over={isOver(droppable)}
      {@attach drop(droppable)}
    >
      <h2>{i === 0 ? 'First' : 'Second'}</h2>
      {#each columns[column] as item (item.id)}
        {@const draggable = draggableFor(item)}
        <div
          class="item"
          class:dragged={isDragged(draggable)}
          data-id={item.id}
          {@attach drag(draggable)}
        >
          {item.label}
        </div>
      {/each}
      {#if columns[column].length === 0 && !isOver(droppable)}
        <div class="empty">Drop here</div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .board {
    display: flex;
    gap: 2rem;
    padding: 1rem;
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 200px;
    min-height: 240px;
    max-height: 400px;
    overflow-y: auto;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    background: #fafafa;
  }

  .column.over {
    border-color: #646cff;
    background: #f0f0ff;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
  }

  .item {
    padding: 0.5rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: grab;
    user-select: none;
  }

  .item.dragged {
    opacity: 0.4;
  }

  .empty {
    color: #999;
    text-align: center;
    padding: 2rem 0;
    font-size: 0.9rem;
  }
</style>
