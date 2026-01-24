export interface Registry<K, V> {
  get(key: K): V;
}

export interface MutableRegistry<K, V> extends Registry<K, V> {
  set(key: K, val: V): void;
  delete(key: K): void;
}

export function fromRecord<R extends Record<string, unknown>>(
  record: R
): Registry<keyof R, R[keyof R]> {
  return {
    get(key) {
      return record[key];
    },
  };
}

export function fromConstant<V>(value: V): Registry<any, V> {
  return {
    get() {
      return value;
    },
  };
}
