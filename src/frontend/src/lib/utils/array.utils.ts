/**
 * Splits an array into consecutive groups of at most `size`, preserving order.
 *
 * A `size` below one would never consume the input, so it yields a single group.
 */
export const chunk = <T>({ elements, size }: { elements: T[]; size: number }): T[][] => {
	if (size < 1) {
		return elements.length === 0 ? [] : [elements];
	}

	return Array.from({ length: Math.ceil(elements.length / size) }, (_, index) =>
		elements.slice(index * size, index * size + size)
	);
};

export const last = <T>(elements: T[]): T | undefined => {
	const { length, [length - 1]: last } = elements;
	return last;
};

// eslint-disable-next-line local-rules/prefer-object-params
export const primitiveArrayEqual = <T extends string | number | boolean | bigint | symbol>(
	a: T[],
	b: T[]
): boolean => {
	if (a.length !== b.length) {
		return false;
	}

	return a.every((v, i) => v === b[i]);
};
