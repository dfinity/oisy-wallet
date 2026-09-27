import { TimeoutError } from '$lib/types/errors';

export const waitForMilliseconds = (milliseconds: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});

/**
 * Settles as `promise` does, unless it takes longer than `milliseconds`, in which case it rejects
 * with a `TimeoutError`.
 *
 * Nothing is cancelled: the work behind `promise` carries on, only its answer is no longer waited
 * for. So a caller may give up only on work that is safe to repeat or to abandon.
 */
export const withTimeout = async <T>({
	promise,
	milliseconds
}: {
	promise: Promise<T>;
	milliseconds: number;
}): Promise<T> => {
	let timer: ReturnType<typeof setTimeout> | undefined;

	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new TimeoutError(`No answer within ${milliseconds} ms`)),
					milliseconds
				);
			})
		]);
	} finally {
		clearTimeout(timer);
	}
};

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
