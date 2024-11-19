export const batch = async function* <T>({
	promises,
	batchSize
}: {
	promises: Promise<T>[];
	batchSize: number;
}): AsyncGenerator<void> {
	for (let i = 0; i < promises.length; i += batchSize) {
		const batch = promises.slice(i, i + batchSize);
		await Promise.allSettled(batch);
		yield;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
};
