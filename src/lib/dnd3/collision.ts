import type { CollisionInput } from './model.js';

export function rectContains(
  { point }: CollisionInput,
  rect: DOMRect
): number | null {
  if (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  ) {
    return 0;
  }
  return null;
}

export function closestCenter(
  { point }: CollisionInput,
  rect: DOMRect
): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.hypot(point.x - cx, point.y - cy);
}
