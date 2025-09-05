export const batch = async function* <T>({
	promises,
	batchSize
}: {
	promises: (() => Promise<T>)[];
	batchSize: number;
}): AsyncGenerator<PromiseSettledResult<T>[]> {
	for (let i = 0; i < promises.length; i += batchSize) {
		const batch = promises.slice(i, i + batchSize);
		const results = await Promise.allSettled(batch.map((fn) => fn()));
		yield results;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
};
