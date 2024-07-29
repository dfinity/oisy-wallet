export const waitForMilliseconds = (milliseconds: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});

export const waitReady = async ({
	retries,
	isDisabled,
	intervalInMs = 500
}: {
	retries: number;
	isDisabled: () => boolean;
	intervalInMs?: number;
}): Promise<'ready' | 'timeout'> => {
	const disabled = isDisabled();

	if (!disabled) {
		return 'ready';
	}

	const remainingRetries = retries - 1;

	if (remainingRetries === 0) {
		return 'timeout';
	}

	await waitForMilliseconds(intervalInMs);

	return waitReady({ retries: remainingRetries, isDisabled });
};
