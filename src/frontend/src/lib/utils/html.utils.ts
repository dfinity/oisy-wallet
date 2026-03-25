let elementsCounters: Record<string, number> = {};

export const nextElementId = (prefix: string): string => {
	elementsCounters = {
		...elementsCounters,
		[prefix]: (elementsCounters[prefix] ?? 0) + 1
	};

	return `${prefix}${elementsCounters[prefix]}`;
};
