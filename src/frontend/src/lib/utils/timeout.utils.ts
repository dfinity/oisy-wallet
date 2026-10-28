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

/**
 * Rejects with `signal`'s reason once it aborts, unless `operation` settles first: the deadline of
 * work that cannot be handed the signal itself, such as a chain of RPC reads. The work goes on, and
 * what it settles with afterwards is ignored.
 */
export const untilAborted = async <T>({
	operation,
	signal
}: {
	operation: Promise<T>;
	signal: AbortSignal;
}): Promise<T> => {
	let onAbort: (() => void) | undefined;

	// As above, `operation` is subscribed to straight away, so a rejection arriving after the signal
	// aborted is still handled and cannot surface as an unhandled rejection.
	try {
		return await Promise.race([
			operation,
			new Promise<never>((_, reject) => {
				onAbort = () => reject(signal.reason);

				if (signal.aborted) {
					onAbort();
					return;
				}

				signal.addEventListener('abort', onAbort, { once: true });
			})
		]);
	} finally {
		if (nonNullish(onAbort)) {
			signal.removeEventListener('abort', onAbort);
		}
	}
};

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
