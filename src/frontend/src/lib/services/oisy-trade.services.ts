import type {
	GetOrderBookDepthRequest,
	LimitOrderRequest,
	OrderBookDepth,
	OrderBookTicker,
	OrderId,
	TradingPair
} from '$declarations/oisy_trade/oisy_trade.did';
import {
	addLimitOrder as addLimitOrderApi,
	getBalances,
	getOrderBookDepth as getOrderBookDepthApi,
	getOrderBookTicker as getOrderBookTickerApi,
	getTradingPairs,
	listSupportedTokens
} from '$lib/api/oisy-trade.api';
import { i18n } from '$lib/stores/i18n.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { NullishIdentity } from '$lib/types/identity';
import type { OisyTradeOrderBook } from '$lib/types/oisy-trade';
import { consoleError } from '$lib/utils/console.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

// Best-effort load of trading pairs, supported tokens and the caller's DEX
// balances into `oisyTradeStore`; errors are logged so a transient canister
// failure never breaks the Trading tab. Read-only.
export const loadOisyTrade = async ({ identity }: { identity: NullishIdentity }): Promise<void> => {
	if (isNullish(identity)) {
		oisyTradeStore.reset();
		return;
	}

	const nullishIdentityErrorMessage = get(i18n).auth.error.no_internet_identity;

	try {
		const [pairs, supportedTokens, balances] = await Promise.all([
			getTradingPairs({ identity, nullishIdentityErrorMessage }),
			listSupportedTokens({ identity, nullishIdentityErrorMessage }),
			getBalances({ identity, nullishIdentityErrorMessage })
		]);

		oisyTradeStore.set({ pairs, supportedTokens, balances });
	} catch (err: unknown) {
		consoleError(err);
	}
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
