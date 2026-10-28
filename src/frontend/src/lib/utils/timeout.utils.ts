import { TimeoutError } from '$lib/types/errors';
import { nonNullish } from '@dfinity/utils';

/**
 * Resolves with `fallback` when `operation` has not answered within `milliseconds`.
 *
 * For work that can fail by never settling rather than by rejecting, which a `try`/`catch` cannot
 * see: an IndexedDB request whose `open` fires neither `success`, `error` nor `blocked` waits for
 * the life of the page, and so does everything queued behind it.
 */
export const withDeadline = async <T>({
	operation,
	fallback,
	milliseconds
}: {
	operation: Promise<T>;
	fallback: T;
	milliseconds: number;
}): Promise<T> => {
	let timer: ReturnType<typeof setTimeout> | undefined;

	// `Promise.race` subscribes to `operation` straight away, so a rejection arriving after the
	// deadline has answered is still handled and cannot surface as an unhandled rejection.
	try {
		return await Promise.race([
			operation,
			new Promise<T>((resolve) => {
				timer = setTimeout(() => resolve(fallback), milliseconds);
			})
		]);
	} finally {
		if (nonNullish(timer)) {
			clearTimeout(timer);
		}
	}
};

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
