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
