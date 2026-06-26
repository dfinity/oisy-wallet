import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { enabledIcTokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { OisyTradeAsset } from '$lib/types/oisy-trade';
import {
	oisyTradeDepositableTokens as mapDepositableTokens,
	mapOisyTradeAssets,
	oisyTradeSupportedTokenSymbols as mapSupportedTokenSymbols,
	sumOisyTradeAssetsUsd
} from '$lib/utils/oisy-trade.utils';
import { derived, type Readable } from 'svelte/store';

export const oisyTradePairs: Readable<TradingPairInfo[]> = derived(
	oisyTradeStore,
	({ pairs }) => pairs ?? []
);

export const oisyTradeSupportedTokens: Readable<Token[]> = derived(
	oisyTradeStore,
	({ supportedTokens }) => supportedTokens ?? []
);

export const oisyTradeBalances: Readable<UserTokenBalance[]> = derived(
	oisyTradeStore,
	({ balances }) => balances ?? []
);

// The distinct union of base + quote token symbols across all trading pairs —
// the set of tokens OISY TRADE supports (onboarding chips, empty states).
export const oisyTradeSupportedTokenSymbols: Readable<string[]> = derived(
	oisyTradePairs,
	($pairs) => mapSupportedTokenSymbols($pairs)
);

// DEX balances resolved to OISY tokens, enriched with totals and fiat values.
export const oisyTradeAssets: Readable<OisyTradeAsset[]> = derived(
	[oisyTradeBalances, enabledIcTokens, exchanges],
	([$balances, $enabledIcTokens, $exchanges]) =>
		mapOisyTradeAssets({
			balances: $balances,
			tokens: $enabledIcTokens,
			exchanges: $exchanges
		})
);

// Total fiat value of all DEX-deposited balances (free + reserved), added to
// the hero net-worth total.
export const oisyTradeUsdValue: Readable<number> = derived(oisyTradeAssets, ($assets) =>
	sumOisyTradeAssetsUsd($assets)
);

// Whether the user has any DEX deposit yet — drives the onboarding-vs-sections
// state on the Trading tab.
export const oisyTradeHasAssets: Readable<boolean> = derived(
	oisyTradeAssets,
	($assets) => $assets.length > 0
);

// The OISY tokens the user can deposit: DEX-supported tokens (matched by ledger
// canister id) that the user holds. Resolved against `enabledIcTokens` — the
// user's enabled IC tokens including testnets — so a testnet DEX (e.g. staging,
// which trades TESTICP / ckSepolia*) surfaces the right tokens, not just mainnet.
// Tokens whose balance can't cover the ledger fee still appear (Max clamps to 0).
export const oisyTradeDepositableTokens: Readable<IcToken[]> = derived(
	[oisyTradeSupportedTokens, enabledIcTokens, balancesStore],
	([$supportedTokens, $enabledIcTokens, $balances]) =>
		mapDepositableTokens({
			supportedTokens: $supportedTokens,
			tokens: $enabledIcTokens,
			hasBalance: (token) => ($balances?.[token.id]?.data ?? ZERO) > ZERO
		})
);
