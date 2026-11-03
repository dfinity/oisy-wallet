import type {
	GetOrderBookDepthRequest,
	LimitOrderRequest,
	TokenId as OisyTradeTokenId,
	OrderBookDepth,
	OrderBookTicker,
	OrderId,
	TradingPair,
	UserOrder
} from '$declarations/oisy_trade/oisy_trade.did';
import {
	addLimitOrder as addLimitOrderApi,
	cancelLimitOrder as cancelLimitOrderApi,
	getBalances,
	getMyOrders,
	getOrderBookDepth as getOrderBookDepthApi,
	getOrderBookTicker as getOrderBookTickerApi,
	getTradingPairs,
	listSupportedTokens,
	withdraw
} from '$lib/api/oisy-trade.api';
import {
	OISY_TRADE_MAX_ORDER_PAGES,
	OISY_TRADE_ORDERS_PAGE_SIZE
} from '$lib/constants/oisy-trade.constants';
import { authIdentity } from '$lib/derived/auth.derived';
import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { NullishIdentity } from '$lib/types/identity';
import type { OisyTradeOrderBook } from '$lib/types/oisy-trade';
import { consoleError } from '$lib/utils/console.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

// Loads the caller's orders newest-first, following the `get_my_orders`
// `ByPage` cursor. The canister caps a page at `OISY_TRADE_ORDERS_PAGE_SIZE`, so
// up to `OISY_TRADE_MAX_ORDER_PAGES` pages are fetched to surface deeper history.
// Best-effort: a failing page returns the orders loaded so far, keeping orders
// non-critical to the rest of the load.
const loadMyOrders = async ({
	identity,
	nullishIdentityErrorMessage
}: {
	identity: NonNullable<NullishIdentity>;
	nullishIdentityErrorMessage: string;
}): Promise<UserOrder[]> => {
	const orders: UserOrder[] = [];
	let after: [] | [OrderId] = [];

	for (let page = 0; page < OISY_TRADE_MAX_ORDER_PAGES; page += 1) {
		const batch: UserOrder[] | null = await getMyOrders({
			identity,
			nullishIdentityErrorMessage,
			args: { filter: { ByPage: { after, length: OISY_TRADE_ORDERS_PAGE_SIZE } } }
		}).catch((err: unknown) => {
			consoleError(err);
			return null;
		});

		if (isNullish(batch)) {
			break;
		}

		orders.push(...batch);

		// A short page means the oldest order has been reached; stop paging.
		const lastOrder = batch.at(-1);
		if (batch.length < OISY_TRADE_ORDERS_PAGE_SIZE || isNullish(lastOrder)) {
			break;
		}

		after = [lastOrder.id];
	}

	return orders;
};

// The load is fire-and-forget and has several concurrent callers — the app-wide
// `LoaderOisyTrade`, the initial load each `IntervalLoader` fires on mount, the
// poll itself, and the post-deposit / post-withdraw / post-limit-order refreshes
// — so a request can resolve after a sign-out has reset the store, or after a
// newer request for the same account has already written. Every invocation takes
// the next generation, and only the newest one may commit; the identity is
// re-checked as well, so a result for a principal that is no longer signed in is
// dropped even if nothing newer has started.
let loadGeneration = 0;

const isCurrentLoad = ({
	generation,
	identity
}: {
	generation: number;
	identity: NonNullable<NullishIdentity>;
}): boolean =>
	generation === loadGeneration &&
	get(authIdentity)?.getPrincipal().toText() === identity.getPrincipal().toText();

// Best-effort load of trading pairs, supported tokens and the caller's DEX
// balances into `oisyTradeStore`; errors are logged so a transient canister
// failure never breaks the Trading tab. Read-only.
export const loadOisyTrade = async ({ identity }: { identity: NullishIdentity }): Promise<void> => {
	// Taken before the nullish check on purpose: a sign-out has to invalidate the
	// loads already in flight, not just skip its own.
	const generation = ++loadGeneration;

	if (isNullish(identity)) {
		oisyTradeStore.reset();
		return;
	}

	const nullishIdentityErrorMessage = get(i18n).auth.error.no_internet_identity;

	try {
		// Orders are non-critical: `loadMyOrders` falls back to whatever loaded so
		// the core pairs/tokens/balances still populate the Trading tab.
		const [pairs, supportedTokens, balances, orders] = await Promise.all([
			getTradingPairs({ identity, nullishIdentityErrorMessage }),
			listSupportedTokens({ identity, nullishIdentityErrorMessage }),
			getBalances({ identity, nullishIdentityErrorMessage }),
			loadMyOrders({ identity, nullishIdentityErrorMessage })
		]);

		if (!isCurrentLoad({ generation, identity })) {
			return;
		}

		oisyTradeStore.set({ pairs, supportedTokens, balances, orders });
	} catch (err: unknown) {
		consoleError(err);
	}
};

// Balances-only load for the app-wide `LoaderOisyTrade`: the hero's net worth is
// the sole consumer outside the Trading surfaces, and `oisyTradeUsdValue` derives
// from the balances joined against `enabledIcTokens` and `exchanges` — nothing
// else the full load fetches is read there. One query instead of four to eight,
// and the total no longer waits on the caller's order history. The write goes
// through `setBalances` so it cannot blank what the Trading tab has loaded,
// mirroring `loadOisyTradeSwapPairs`/`setPairs` for the quote path.
//
// Shares `loadGeneration` with the full load, so whichever started last wins. A
// full load losing to this one would drop its pairs/tokens/orders, but the
// app-wide effect only re-runs on an identity change, and that resets the store
// anyway. Best-effort: errors are logged, never surfaced.
export const loadOisyTradeBalances = async ({
	identity
}: {
	identity: NullishIdentity;
}): Promise<void> => {
	const generation = ++loadGeneration;

	if (isNullish(identity)) {
		oisyTradeStore.reset();
		return;
	}

	const nullishIdentityErrorMessage = get(i18n).auth.error.no_internet_identity;

	try {
		const balances = await getBalances({ identity, nullishIdentityErrorMessage });

		if (!isCurrentLoad({ generation, identity })) {
			return;
		}

		oisyTradeStore.setBalances(balances);
	} catch (err: unknown) {
		consoleError(err);
	}
};

// Withdraws `amount` (the gross figure entered by the user) from the caller's
// free DEX balance back to their wallet. The ledger transfer fee is deducted by
// the canister, so the user receives `amount - ledger_fee`. On success the
// Trading-tab balances are reloaded so the new free balance is reflected.
export const withdrawFromOisyTrade = async ({
	identity,
	tokenId,
	amount,
	decimals,
	progress
}: {
	identity: NullishIdentity;
	tokenId: OisyTradeTokenId;
	amount: string;
	decimals: number;
	progress?: (step: ProgressStepsTradingWithdraw) => void;
}): Promise<void> => {
	progress?.(ProgressStepsTradingWithdraw.WITHDRAW);

	const nullishIdentityErrorMessage = get(i18n).auth.error.no_internet_identity;

	assertNonNullish(identity, nullishIdentityErrorMessage);

	await withdraw({
		identity,
		nullishIdentityErrorMessage,
		request: {
			token_id: tokenId,
			amount: parseToken({ value: amount, unitName: decimals })
		}
	});

	progress?.(ProgressStepsTradingWithdraw.UPDATE_UI);

	await loadOisyTrade({ identity });

	progress?.(ProgressStepsTradingWithdraw.DONE);
};

// Best-effort load of the live ticker + aggregated depth for a single pair,
// used to keep the limit-order form's crossing/queue-position state fresh on a
// short interval. Returns `undefined` on a transient failure so the form keeps
// the last good snapshot instead of breaking. Read-only.
export const loadOrderBook = async ({
	identity,
	pair
}: {
	identity: NullishIdentity;
	pair: TradingPair;
}): Promise<OisyTradeOrderBook | undefined> => {
	if (isNullish(identity)) {
		return undefined;
	}

	const nullishIdentityErrorMessage = get(i18n).auth.error.no_internet_identity;

	try {
		const request: GetOrderBookDepthRequest = { trading_pair: pair, limit: [] };

		const [ticker, depth]: [OrderBookTicker, OrderBookDepth] = await Promise.all([
			getOrderBookTickerApi({ identity, pair, nullishIdentityErrorMessage }),
			getOrderBookDepthApi({ identity, request, nullishIdentityErrorMessage })
		]);

		return { ticker, depth };
	} catch (err: unknown) {
		consoleError(err);
		return undefined;
	}
};

// Submit a limit order. The canister returns an `OrderId` once the order is
// accepted into the matching queue (not once it fills). Throws on failure so
// the wizard can surface the error.
export const placeLimitOrder = async ({
	identity,
	request
}: {
	identity: NullishIdentity;
	request: LimitOrderRequest;
}): Promise<OrderId> => {
	const nullishIdentityErrorMessage = get(i18n).auth.error.no_internet_identity;

	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await addLimitOrderApi({ identity, request, nullishIdentityErrorMessage });
};

export const cancelLimitOrder = async ({
	identity,
	orderId
}: {
	identity: NullishIdentity;
	orderId: OrderId;
}): Promise<void> => {
	const nullishIdentityErrorMessage = get(i18n).auth.error.no_internet_identity;

	assertNonNullish(identity, nullishIdentityErrorMessage);

	await cancelLimitOrderApi({ identity, orderId, nullishIdentityErrorMessage });
};
