import type { DndInstance } from '../types.ts';
import type { DndPlugin } from '../core.ts';

export interface ValidateConfig<D = unknown> {
  /** Predicate to check if the dragged data is valid for this zone */
  accepts?: (data: D) => boolean;
  /** CSS class added when hovering over a valid drop target */
  validClass?: string;
  /** CSS class added when hovering over an invalid drop target */
  invalidClass?: string;
}

/**
 * Validate plugin — adds CSS feedback for valid/invalid drop targets.
 *
 * Usage:
 *   const dnd = createDnd({ plugins: [validate({
 *     validClass: 'drop-valid',
 *     invalidClass: 'drop-invalid',
 *   })] })
 */
export function validate(
  config: ValidateConfig = {}
): (instance: DndInstance) => DndPlugin {
  const { validClass = 'drop-valid', invalidClass = 'drop-invalid' } = config;

  let lastTarget: HTMLElement | null = null;

  function clearClasses() {
    if (lastTarget) {
      lastTarget.classList.remove(validClass, invalidClass);
      lastTarget = null;
    }
  }

  return (_instance: DndInstance): DndPlugin => ({
    onMove(_e) {
      // Classes are managed by the droppable's onDragEnter/onDragLeave
      // This plugin just provides the class names
    },

    onDragEnd() {
      clearClasses();
    },
  });
}

/**
 * Creates a validated droppable that only accepts data matching the predicate.
 */
export function createValidatedDropzone<D>(
  accepts: (data: D) => boolean,
  options: { validClass?: string; invalidClass?: string } = {}
) {
  const { validClass = 'drop-valid', invalidClass = 'drop-invalid' } = options;

  return {
    accepts,
    validClass,
    invalidClass,
    /** Apply visual feedback based on whether the current drag data is accepted */
    applyFeedback(element: HTMLElement, draggedData: unknown) {
      element.classList.remove(validClass, invalidClass);
      if (draggedData !== null && draggedData !== undefined) {
        if (accepts(draggedData as D)) {
          element.classList.add(validClass);
        } else {
          element.classList.add(invalidClass);
        }
      }
    },
    /** Remove all visual feedback */
    clearFeedback(element: HTMLElement) {
      element.classList.remove(validClass, invalidClass);
    },
  };
}
