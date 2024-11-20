/**
 * Wait for a random amount of time between min and max
 *
 * @param min - minimum time to sleep
 * @param max - maximum time to sleep
 */
export const randomWait = async ({
	min = 1000,
	max = 2000
}: {
	min?: number;
	max?: number;
}): Promise<void> =>
	await new Promise((resolve) =>
		setTimeout(resolve, Math.floor(Math.random() * Math.max(max - min, 0) + min))
	);
