import type {
	DepositRequest,
	DepositResponse,
	GetMyOrdersArgs,
	LimitOrderRequest,
	OrderId,
	OrderRecord,
	OrderStatus,
	Side,
	Token,
	TradingPairInfo,
	UserOrder,
	UserTokenBalance,
	WithdrawRequest,
	WithdrawResponse
} from '$declarations/oisy_trade/oisy_trade.did';
// Resolves to the real module, not back to this one: the dev-only resolver in
// `vite.config.ts` skips the redirect when the importer is the mock itself.
import {
	getTradingPairs as getTradingPairsApi,
	listSupportedTokens as listSupportedTokensApi
} from '$lib/api/oisy-trade.api';
import { ZERO } from '$lib/constants/app.constants';
import { enabledIcTokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { TokenId } from '$lib/types/token';
import { consoleWarn } from '$lib/utils/console.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { assertNonNullish, isNullish, nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
import { get } from 'svelte/store';

// Dev-only stand-in for the caller-specific half of the OISY TRADE API, so the
// Trade flows can be clicked through without funds and without submitting
// anything on-chain. Activated by `VITE_TRADE_MOCK=true`, which makes the
// resolver in `vite.config.ts` redirect `$lib/api/oisy-trade.api` onto this
// module — nothing imports it otherwise, so it cannot reach a real build.
//
// Market data (pairs, supported tokens, ticker, depth) is re-exported untouched
// from the real API: those reads need no funds, so the limit-order form still
// shows genuine prices and crossing state. Only the caller's balances and orders
// are fabricated, and the four writes mutate that in-memory state instead of
// calling the canister.
export {
	getOrderBookDepth,
	getOrderBookTicker,
	getTradingPairs,
	listSupportedTokens
} from '$lib/api/oisy-trade.api';

// Total balance seeded per token, in whole token units, keyed by symbol. Values
// are arbitrary but chosen so the fiat totals on the provider page look
// plausible for both mainnet and the testnet twins staging trades.
const MOCK_TOTAL_UNITS: Record<string, string> = {
	BTC: '0.42',
	ckBTC: '0.42',
	ckSepoliaBTC: '0.42',
	ETH: '6.5',
	ckETH: '6.5',
	ckSepoliaETH: '6.5',
	ICP: '3400',
	TESTICP: '3400',
	USDC: '12500',
	ckUSDC: '12500',
	ckSepoliaUSDC: '12500',
	USDT: '12500',
	ckUSDT: '12500'
};

const MOCK_DEFAULT_TOTAL_UNITS = '250';

// Share of the seeded balance that starts locked in open orders, so the provider
// page's "$X free / $Y in orders" split is non-trivial. Taken out of the total
// rather than added on top: on the canister, reserving moves funds out of free.
const MOCK_RESERVED_DIVISOR = 5n;

// Wallet balance seeded per depositable token, in whole units — only so the
// Deposit picker has something to offer. Deliberately smaller than the DEX
// balances above: this is meant to read as "still in the wallet".
const MOCK_WALLET_UNITS = '12';

// Orders are minted against the first pairs the canister lists, cycling through
// these shapes so Active and History both have content: a resting sell, a
// partially filled buy (renders as "Partial"), a filled buy and a canceled sell.
const MOCK_ORDER_SHAPES: { side: Side; status: OrderStatus; filledPercent: bigint }[] = [
	{ side: { Sell: null }, status: { Open: null }, filledPercent: ZERO },
	{ side: { Buy: null }, status: { Open: null }, filledPercent: 35n },
	{ side: { Buy: null }, status: { Filled: null }, filledPercent: 100n },
	{ side: { Sell: null }, status: { Canceled: null }, filledPercent: ZERO }
];

const MOCK_ORDER_QUANTITY_LOTS = 120n;
const MOCK_ORDER_PRICE_TICKS = 250n;

const NANO_SECONDS_IN_HOUR = 3_600_000_000_000n;

const HUNDRED = 100n;

interface MockBalance {
	token: Token;
	free: bigint;
	reserved: bigint;
}

interface MockState {
	// Keyed by ledger canister id text.
	balances: Map<string, MockBalance>;
	orders: UserOrder[];
	nextOrderSeq: number;
}

let state: MockState | undefined;

// Resolves once the first seed completes, so concurrent `getBalances` /
// `getMyOrders` calls from `loadOisyTrade`'s `Promise.all` seed only once.
let seeding: Promise<MockState> | undefined;

// Principal the cached state belongs to.
let seededFor: string | undefined;

const mockOrderId = (seq: number): OrderId => seq.toString(16).padStart(32, '0');

// The real API asserts the identity before building the actor; mirror that so a
// signed-out caller fails the same way instead of minting orders with no owner.
const owner = ({
	identity,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams): OrderRecord['owner'] => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return identity.getPrincipal();
};

const scaled = ({ value, decimals }: { value: string; decimals: number }): bigint =>
	parseToken({ value, unitName: decimals });

const totalUnitsFor = (symbol: string): string =>
	MOCK_TOTAL_UNITS[symbol] ?? MOCK_DEFAULT_TOTAL_UNITS;

// The DEX tokens the wallet can actually render: `mapOisyTradeAssets` and
// `mapOisyTradeOrders` join on ledger canister id against the user's enabled IC
// tokens and silently drop anything unmatched, so seeding a token the wallet
// doesn't know about would produce invisible rows.
const walletKnownTokens = (supportedTokens: Token[]): Token[] => {
	const walletLedgers = new Set(
		get(enabledIcTokens).map(({ ledgerCanisterId }) => ledgerCanisterId)
	);

	return supportedTokens.filter(({ id }) => walletLedgers.has(id.ledger_id.toText()));
};

const seedBalances = (tokens: Token[]): Map<string, MockBalance> =>
	tokens.reduce<Map<string, MockBalance>>((acc, token) => {
		const {
			id: { ledger_id },
			metadata: { symbol, decimals }
		} = token;

		const total = scaled({ value: totalUnitsFor(symbol), decimals });

		const reserved = total / MOCK_RESERVED_DIVISOR;

		acc.set(ledger_id.toText(), {
			token,
			free: total - reserved,
			reserved
		});

		return acc;
	}, new Map());

const seedOrders = ({
	pairs,
	balances,
	owner
}: {
	pairs: TradingPairInfo[];
	balances: Map<string, MockBalance>;
	owner: OrderRecord['owner'];
}): UserOrder[] => {
	// Only pairs whose both legs were seeded — the same join the order mapper does.
	const tradeable = pairs.filter(
		({ base, quote }) =>
			balances.has(base.id.ledger_id.toText()) && balances.has(quote.id.ledger_id.toText())
	);

	const now = nowInBigIntNanoSeconds();

	return tradeable.slice(0, MOCK_ORDER_SHAPES.length).map((pair, index) => {
		const { side, status, filledPercent } = MOCK_ORDER_SHAPES[index];

		const quantity = pair.lot_size * MOCK_ORDER_QUANTITY_LOTS;

		return {
			id: mockOrderId(index),
			pair: { base: pair.base.id.ledger_id, quote: pair.quote.id.ledger_id },
			order: {
				status,
				owner,
				side,
				quantity,
				filled_quantity: (quantity * filledPercent) / HUNDRED,
				price: pair.tick_size * MOCK_ORDER_PRICE_TICKS,
				created_at: now - BigInt(index + 1) * NANO_SECONDS_IN_HOUR,
				last_updated_at: [],
				time_in_force: { GoodTilCanceled: null }
			}
		};
	});
};

// The Deposit picker only offers tokens whose *wallet* balance is above zero
// (`oisyTradeDepositableTokens`), which an unfunded account never has. Seed one,
// then re-assert it whenever something zeroes it — the wallet workers keep
// publishing the real (empty) balance, and would otherwise empty the picker a
// few seconds after it loads. Comparing before setting keeps this from looping
// on its own writes.
const seedWalletBalances = (tokens: Token[]) => {
	const byLedger = get(enabledIcTokens).reduce<Record<string, { id: TokenId; decimals: number }>>(
		(acc, { ledgerCanisterId, id, decimals }) => ({ ...acc, [ledgerCanisterId]: { id, decimals } }),
		{}
	);

	const seeds = tokens
		.map(({ id: { ledger_id } }) => byLedger[ledger_id.toText()])
		.filter(nonNullish)
		.map(({ id, decimals }) => ({
			id,
			data: scaled({ value: MOCK_WALLET_UNITS, decimals })
		}));

	const assert = () => {
		seeds.forEach(({ id, data }) => {
			if ((get(balancesStore)?.[id]?.data ?? ZERO) === data) {
				return;
			}

			balancesStore.set({ id, data: { data, certified: false } });
		});
	};

	assert();

	const unsubscribe = balancesStore.subscribe(assert);

	// Without this, every hot replacement of this module leaves its subscription
	// behind and they pile up re-asserting the same seeds.
	import.meta.hot?.dispose(unsubscribe);
};

const seedState = async (params: CanisterApiFunctionParams): Promise<MockState> => {
	const [supportedTokens, pairs] = await Promise.all([
		listSupportedTokensApi(params),
		getTradingPairsApi(params)
	]);

	const tokens = walletKnownTokens(supportedTokens);

	if (tokens.length === 0) {
		consoleWarn(
			'VITE_TRADE_MOCK: none of the tokens OISY TRADE supports are enabled in this wallet, so the mocked balances and orders would not render. Enable them under Tokens → Manage.'
		);
	}

	const balances = seedBalances(tokens);

	seedWalletBalances(tokens);

	return {
		balances,
		orders: seedOrders({ pairs, balances, owner: owner(params) }),
		nextOrderSeq: MOCK_ORDER_SHAPES.length
	};
};

// Re-asserts the identity on every call, the way the real API does before it
// builds an actor — a cached seed must not let a signed-out caller read
// balances. The state is per-principal: a different caller reseeds rather than
// inheriting the previous one's positions. A failed seed clears the cached
// promise so the next call can retry instead of replaying the rejection.
const mockState = async (params: CanisterApiFunctionParams): Promise<MockState> => {
	const principal = owner(params).toText();

	if (seededFor !== principal) {
		state = undefined;
		seeding = undefined;
	}

	if (nonNullish(state)) {
		return state;
	}

	seeding ??= seedState(params).catch((err: unknown) => {
		seeding = undefined;
		throw err;
	});

	state = await seeding;
	seededFor = principal;

	return state;
};

const balanceEntry = async ({
	params,
	ledgerId
}: {
	params: CanisterApiFunctionParams;
	ledgerId: string;
}): Promise<MockBalance> => {
	const { balances } = await mockState(params);

	const balance = balances.get(ledgerId);

	if (nonNullish(balance)) {
		return balance;
	}

	throw new Error(`VITE_TRADE_MOCK: no mocked balance for ledger ${ledgerId}`);
};

export const getBalances = async (
	params: CanisterApiFunctionParams
): Promise<UserTokenBalance[]> => {
	const { balances } = await mockState(params);

	return [...balances.values()].map(({ token, free, reserved }) => ({
		token,
		balance: { free, reserved }
	}));
};

export const getMyOrders = async (
	params: CanisterApiFunctionParams & { args: GetMyOrdersArgs }
): Promise<UserOrder[]> => {
	const { orders } = await mockState(params);

	// Compared as bigints: `Number(b - a)` would narrow a nanosecond delta.
	return [...orders].sort(({ order: a }, { order: b }) =>
		b.created_at === a.created_at ? 0 : b.created_at > a.created_at ? 1 : -1
	);
};

export const deposit = async (
	params: CanisterApiFunctionParams<{ request: DepositRequest }>
): Promise<DepositResponse> => {
	const {
		request: { token_id, amount }
	} = params;

	const balance = await balanceEntry({ params, ledgerId: token_id.ledger_id.toText() });

	balance.free += amount;

	return { block_index: BigInt(Date.now()) };
};

export const withdraw = async (
	params: CanisterApiFunctionParams<{ request: WithdrawRequest }>
): Promise<WithdrawResponse> => {
	const {
		request: { token_id, amount }
	} = params;

	const balance = await balanceEntry({ params, ledgerId: token_id.ledger_id.toText() });

	if (balance.free < amount) {
		throw new Error('VITE_TRADE_MOCK: insufficient free balance to withdraw');
	}

	balance.free -= amount;

	return { block_index: BigInt(Date.now()) };
};

// Mirrors what the canister reserves on submission: a buy locks quote
// (`price × quantity / 10^base_decimals`), a sell locks the base quantity — so
// the free/reserved split on the provider page moves the way it would live.
const reserveFor = async ({
	params,
	request
}: {
	params: CanisterApiFunctionParams;
	request: LimitOrderRequest;
}): Promise<void> => {
	const { pair, side, quantity, price } = request;

	const isBuy = 'Buy' in side;

	const ledgerId = (isBuy ? pair.quote : pair.base).toText();

	const balance = await balanceEntry({ params, ledgerId });

	const base = await balanceEntry({ params, ledgerId: pair.base.toText() });

	const amount = isBuy
		? (price * quantity) / 10n ** BigInt(base.token.metadata.decimals)
		: quantity;

	if (balance.free < amount) {
		throw new Error('VITE_TRADE_MOCK: insufficient free balance for this order');
	}

	balance.free -= amount;
	balance.reserved += amount;
};

export const addLimitOrder = async (
	params: CanisterApiFunctionParams & { request: LimitOrderRequest }
): Promise<OrderId> => {
	const { request } = params;

	const current = await mockState(params);

	await reserveFor({ params, request });

	const id = mockOrderId(current.nextOrderSeq);

	current.nextOrderSeq += 1;

	current.orders = [
		...current.orders,
		{
			id,
			pair: request.pair,
			order: {
				status: { Open: null },
				owner: owner(params),
				side: request.side,
				quantity: request.quantity,
				filled_quantity: ZERO,
				price: request.price,
				created_at: nowInBigIntNanoSeconds(),
				last_updated_at: [],
				time_in_force: request.time_in_force?.[0] ?? { GoodTilCanceled: null }
			}
		}
	];

	return id;
};

export const cancelLimitOrder = async (
	params: CanisterApiFunctionParams & { orderId: OrderId }
): Promise<OrderRecord> => {
	const { orderId } = params;

	const current = await mockState(params);

	const target = current.orders.find(({ id }) => id === orderId);

	if (isNullish(target)) {
		throw new Error(`VITE_TRADE_MOCK: unknown order ${orderId}`);
	}

	const canceled: OrderRecord = {
		...target.order,
		status: { Canceled: null },
		last_updated_at: [nowInBigIntNanoSeconds()]
	};

	current.orders = current.orders.map((order) =>
		order.id === orderId ? { ...order, order: canceled } : order
	);

	// Release what the order had locked, so the freed funds show up again.
	const isBuy = 'Buy' in target.order.side;
	const ledgerId = (isBuy ? target.pair.quote : target.pair.base).toText();
	const base = await balanceEntry({ params, ledgerId: target.pair.base.toText() });
	const remaining = target.order.quantity - target.order.filled_quantity;

	const amount = isBuy
		? (target.order.price * remaining) / 10n ** BigInt(base.token.metadata.decimals)
		: remaining;

	const balance = await balanceEntry({ params, ledgerId });

	const released = amount > balance.reserved ? balance.reserved : amount;

	balance.reserved -= released;
	balance.free += released;

	return canceled;
};
