export const waitForMilliseconds = (milliseconds: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});

export const waitReady = async ({
	count,
	isDisabled
}: {
	count: number;
	isDisabled: () => boolean;
}): Promise<'ready' | 'timeout'> => {
	const disabled = isDisabled();

	if (!disabled) {
		return 'ready';
	}

	const nextCount = count - 1;

	if (nextCount === 0) {
		return 'timeout';
	}

	await new Promise((resolve) => setTimeout(resolve, 500));

	return waitReady({ count: nextCount, isDisabled });
};
