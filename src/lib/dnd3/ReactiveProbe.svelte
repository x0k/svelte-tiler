<script lang="ts">
  import {
    createDnd,
    createDraggable,
    createDroppable,
    drag,
    drop,
    isDragged,
    isOver,
    pointerSensor,
  } from '$lib/dnd3/index.js';

  const dnd = createDnd({ plugins: [pointerSensor()] });
  const draggable = createDraggable(dnd, {
    id: 'src',
    data: () => 'payload',
  });
  const droppable = createDroppable(dnd, { id: 'dst' });
</script>

<div
  data-testid="item"
  data-dragged={isDragged(draggable)}
  style="position:absolute;left:0;top:0;width:50px;height:50px;"
  {@attach drag(draggable)}
>
  item
</div>
<div
  data-testid="zone"
  data-over={isOver(droppable)}
  style="position:absolute;left:200px;top:200px;width:100px;height:100px;"
  {@attach drop(droppable)}
>
  zone
</div>
