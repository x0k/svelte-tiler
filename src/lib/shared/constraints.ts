export type ConstraintUnit = 'px' | 'weight' | '%';

export type ConstraintType = 'maxSize' | 'minSize';

export interface Constraint {
  type: ConstraintType;
  unit: ConstraintUnit;
  value: number;
}

export type NormalizedConstraints = Record<ConstraintType, number>;

interface Sizes {
  totalWeight: number;
  totalSizePx: number;
  totalSizePercent: number;
}

export interface NormalizeOptions extends Sizes {
  constraints: Constraint[];
  targetUnit: ConstraintUnit;
}

const UNIT_TO_TOTAL_SIZE: Record<ConstraintUnit, keyof Sizes> = {
  px: 'totalSizePx',
  '%': 'totalSizePercent',
  weight: 'totalWeight',
};

const CONSTRAINT_COMBINATOR: Record<
  ConstraintType,
  (a: number, b: number) => number
> = {
  maxSize: Math.min,
  minSize: Math.max,
};

// TODO: Handle 0 total sizes
export function normalize(options: NormalizeOptions): NormalizedConstraints {
  const result: NormalizedConstraints = {
    maxSize: Infinity,
    minSize: 0,
  };
  const targetTotal = options[UNIT_TO_TOTAL_SIZE[options.targetUnit]];
  for (const constraint of options.constraints) {
    // (constraint.value * targetTotal) / sourceTotal;
    const normalizedValue =
      options.targetUnit === constraint.unit
        ? constraint.value
        : (constraint.value * targetTotal) /
          options[UNIT_TO_TOTAL_SIZE[constraint.unit]];

    result[constraint.type] = CONSTRAINT_COMBINATOR[constraint.type](
      result[constraint.type],
      normalizedValue
    );
  }
  return result;
}
