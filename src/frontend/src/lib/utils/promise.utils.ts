/**
 * Like Promise.all but limits the number of tasks running concurrently.
 *
 * Tasks beyond the concurrency limit are queued and started as earlier ones finish.
 * Order of results matches the order of the input array.
 */
export const promiseAllLimited = async <T>({
	tasks,
	concurrency
}: {
	tasks: (() => Promise<T>)[];
	concurrency: number;
}): Promise<T[]> => {
	const results: T[] = new Array(tasks.length);
	let nextIndex = 0;

	const runNext = async (): Promise<void> => {
		while (nextIndex < tasks.length) {
			const currentIndex = nextIndex++;
			results[currentIndex] = await tasks[currentIndex]();
		}
	};

	const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext());

	await Promise.all(workers);

	return results;
};
