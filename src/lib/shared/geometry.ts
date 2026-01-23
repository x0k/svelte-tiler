export type EdgePart = 'start' | 'center' | 'end';

export function getEdgePart(a: number, b: number, x: number, ratio: number): EdgePart | undefined {
	if (x < a || x > b) {
		return undefined;
	}
	x -= a;
	const len = b - a;
	const start = len * ratio;
	if (x < start) {
		return 'start';
	}
	const end = len * (1 - ratio);
	if (x > end) {
		return 'end';
	}
	return 'center';
}

export function getRectParts(rect: DOMRect, x: number, y: number, ratio: number) {
	return {
		hpart: getEdgePart(rect.left, rect.right, x, ratio),
		vpart: getEdgePart(rect.top, rect.bottom, y, ratio)
	};
}

export function almostEqual(a: number, b: number, eps = 1e-6): boolean {
	return Math.abs(a - b) < eps;
}
