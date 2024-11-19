export const batchPromisesPerSecond = async function* <T, R>({
	items,
	maxCallsPerSecond,
	promise,
	validate,
	afterPromise
}: {
	items: T[];
	maxCallsPerSecond: number;
	promise: (item: T) => Promise<R>;
	validate?: (item: T) => boolean;
	afterPromise?: (item: T) => void;
}): AsyncGenerator<void> {
	for (let i = 0; i < items.length; i += maxCallsPerSecond) {
		const batch = items.slice(i, i + maxCallsPerSecond);

		const batchPromises = batch.map((item) => async () => {
			if (validate?.(item)) {
				return;
			}

			await promise(item);
			afterPromise?.(item);
		});

		await Promise.allSettled(batchPromises.map((fn) => fn()));
		yield;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
};
