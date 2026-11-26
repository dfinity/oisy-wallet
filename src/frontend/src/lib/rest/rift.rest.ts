import { RIFT_API_KEY, RIFT_API_URL } from '$env/rest/rift.env';
import {
	RIFT_DEFAULT_RETRY_AFTER_MS,
	RIFT_MIN_REQUEST_INTERVAL_MS,
	RIFT_REQUEST_TIMEOUT_MS
} from '$lib/constants/swap.constants';
import { RiftErrorSchema, RiftOrderSchema, RiftQuoteSchema } from '$lib/schema/rift.schema';
import {
	RiftApiError,
	RiftInvalidResponseError,
	RiftRequestSupersededError
} from '$lib/types/errors';
import type { RiftOrder, RiftOrderRequest, RiftQuote, RiftQuoteRequest } from '$lib/types/rift';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import type * as z from 'zod';

/**
 * What a request is for, which sets its place in the queue. An order request — creating an order, or
 * reading it right before a deposit is broadcast — goes before any waiting quote or status read: the
 * user is waiting on it at Swap. The rest go first come, first served.
 */
type RiftRequestKind = 'order' | 'quote' | 'status';

interface RiftWaiter {
	kind: RiftRequestKind;
	start: () => void;
	supersede: () => void;
}

// One limiter for every request to Rift, so quoting, order creation and the poller share one budget:
// starts at least `RIFT_MIN_REQUEST_INTERVAL_MS` apart, and nothing at all until a 429's
// `Retry-After` has elapsed. Module state, as the budget is the session's.
let waiters: RiftWaiter[] = [];
let lastStartAt: number | undefined;
let cooldownUntil = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

const nextStartAt = (): number =>
	Math.max(isNullish(lastStartAt) ? 0 : lastStartAt + RIFT_MIN_REQUEST_INTERVAL_MS, cooldownUntil);

const takeNextWaiter = (): RiftWaiter | undefined => {
	const orderIndex = waiters.findIndex(({ kind }) => kind === 'order');
	const [waiter] = waiters.splice(orderIndex === -1 ? 0 : orderIndex, 1);
	return waiter;
};

const schedule = () => {
	if (nonNullish(timer) || waiters.length === 0) {
		return;
	}

	timer = setTimeout(
		() => {
			timer = undefined;

			// A 429 since this was scheduled may have pushed the next start back.
			if (Date.now() >= nextStartAt()) {
				lastStartAt = Date.now();
				takeNextWaiter()?.start();
			}

			schedule();
		},
		Math.max(0, nextStartAt() - Date.now())
	);
};

const waitForTurn = (kind: RiftRequestKind): Promise<void> =>
	new Promise((resolve, reject) => {
		if (kind === 'quote') {
			// Only the latest inputs are worth quoting: a quote still waiting is dropped, unsent.
			waiters.filter((waiter) => waiter.kind === 'quote').forEach(({ supersede }) => supersede());
			waiters = waiters.filter((waiter) => waiter.kind !== 'quote');
		}

		waiters.push({
			kind,
			start: resolve,
			supersede: () => reject(new RiftRequestSupersededError())
		});

		schedule();
	});

// Rift sends `Retry-After` in seconds. A missing or unreadable one still holds every request back,
// for `RIFT_DEFAULT_RETRY_AFTER_MS`.
const retryAfterMs = (response: Response): number => {
	const seconds = Number(response.headers.get('Retry-After'));
	return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : RIFT_DEFAULT_RETRY_AFTER_MS;
};

const readErrorMessage = async (response: Response): Promise<string> => {
	try {
		const { success, data } = RiftErrorSchema.safeParse(await response.json());
		return success ? data.error : response.statusText;
	} catch (_: unknown) {
		return response.statusText;
	}
};

const requestRift = async <T>({
	kind,
	path,
	body,
	schema
}: {
	kind: RiftRequestKind;
	path: string;
	body?: RiftQuoteRequest | RiftOrderRequest;
	schema: z.ZodType<T>;
}): Promise<T> => {
	await waitForTurn(kind);

	const response = await fetch(`${RIFT_API_URL}${path}`, {
		method: nonNullish(body) ? 'POST' : 'GET',
		headers: {
			...(nonNullish(body) && { 'Content-Type': 'application/json' }),
			...(notEmptyString(RIFT_API_KEY) && { 'x-api-key': RIFT_API_KEY })
		},
		...(nonNullish(body) && { body: JSON.stringify(body) }),
		signal: AbortSignal.timeout(RIFT_REQUEST_TIMEOUT_MS)
	});

	if (response.status === 429) {
		cooldownUntil = Math.max(cooldownUntil, Date.now() + retryAfterMs(response));
	}

	if (!response.ok) {
		throw new RiftApiError({ status: response.status, message: await readErrorMessage(response) });
	}

	let json: unknown;

	try {
		json = await response.json();
	} catch (err: unknown) {
		throw new RiftInvalidResponseError(`Rift answered ${path} with a body that is not JSON`, {
			cause: err
		});
	}

	const { success, data } = schema.safeParse(json);

	if (!success) {
		throw new RiftInvalidResponseError(`Rift answered ${path} with an unexpected body`);
	}

	return data;
};

/**
 * A quote for swapping `amount_in` of `from` into `to`. Rejects with `RiftApiError` (422 when Rift
 * has no route), `RiftInvalidResponseError`, or `RiftRequestSupersededError` when a newer quote
 * request replaced this one before it was sent.
 *
 * https://www.rift.trade/docs/openapi.json, `POST /quote`
 */
export const postRiftQuote = (request: RiftQuoteRequest): Promise<RiftQuote> =>
	requestRift({ kind: 'quote', path: '/quote', body: request, schema: RiftQuoteSchema });

/**
 * The order for a quote, with the address its deposit goes to. Repeating the call with the same quote
 * and addresses returns the same order; other addresses are refused (409).
 *
 * https://www.rift.trade/docs/openapi.json, `POST /order`
 */
export const postRiftOrder = (request: RiftOrderRequest): Promise<RiftOrder> =>
	requestRift({ kind: 'order', path: '/order', body: request, schema: RiftOrderSchema });

/**
 * An order's current state. `urgent` puts the read ahead of waiting quotes and status reads, for the
 * read right before a deposit is broadcast.
 *
 * https://www.rift.trade/docs/openapi.json, `GET /order/{id}`
 */
export const getRiftOrder = ({
	orderId,
	urgent = false
}: {
	orderId: string;
	urgent?: boolean;
}): Promise<RiftOrder> =>
	requestRift({
		kind: urgent ? 'order' : 'status',
		path: `/order/${encodeURIComponent(orderId)}`,
		schema: RiftOrderSchema
	});

/**
 * Whether Rift is holding every request back after a 429. A request made now would wait out the rest
 * of its `Retry-After`, so a caller that must not wait that long, such as the poller sharing the
 * active-transaction tick with every provider, tries again later instead.
 */
export const isRiftRateLimited = (): boolean => Date.now() < cooldownUntil;

// Test seam: the limiter's state is the module's, and would otherwise leak between cases.
export const resetRiftRateLimiter = () => {
	if (nonNullish(timer)) {
		clearTimeout(timer);
	}

	timer = undefined;
	waiters = [];
	lastStartAt = undefined;
	cooldownUntil = 0;
};
