import { isEmptyString } from '@dfinity/utils';

export const selectColorForName = <T>({
	colors,
	name
}: {
	colors: T[];
	name?: string;
}): T | undefined => {
	if (colors.length === 0) {
		throw new Error('Colors array cannot be empty');
	}

	const trimmedName = name?.trim?.();
	if (isEmptyString(trimmedName)) {
		return undefined;
	}

	const hash = [...trimmedName].reduce<number>(
		(acc, char) => (acc + char.charCodeAt(0)) % colors.length,
		0
	);

	return colors[hash];
};
