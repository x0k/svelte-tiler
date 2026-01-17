export interface Registry<K, V> {
	get(key: K): V;
}

export function fromRecord<R extends Record<string, unknown>>(
	record: R
): Registry<keyof R, R[keyof R]> {
	return {
		get(key) {
			return record[key];
		}
	};
}

export function fromConstant<V>(value: V): Registry<any, V> {
	return {
		get() {
			return value;
		}
	};
}
