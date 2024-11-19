export const batch = async function* <T>({
	promises,
	maxCallsPerSecond
}: {
	promises: Promise<T>[];
	maxCallsPerSecond: number;
}): AsyncGenerator<void> {
	for (let i = 0; i < promises.length; i += maxCallsPerSecond) {
		const batch = promises.slice(i, i + maxCallsPerSecond);
		await Promise.allSettled(batch);
		yield;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
};
