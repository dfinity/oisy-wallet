import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import { SUPPORTED_ICP_TOKENS } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import { allIcrcTokens } from '$lib/derived/all-tokens.derived';
import { exchanges } from '$lib/derived/exchange.derived';
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
	[oisyTradeBalances, allIcrcTokens, exchanges],
	([$balances, $allIcrcTokens, $exchanges]) =>
		mapOisyTradeAssets({
			balances: $balances,
			tokens: [...SUPPORTED_ICP_TOKENS, ...$allIcrcTokens],
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

// The OISY tokens the user can deposit: DEX-supported tokens (matched by symbol)
// that the user holds in their wallet. Used by the deposit token picker. Tokens
// whose balance can't cover the ledger fee still appear (Max clamps to 0), but a
// token with no balance at all is dropped.
export const oisyTradeDepositableTokens: Readable<IcToken[]> = derived(
	[oisyTradeSupportedTokens, allIcrcTokens, balancesStore],
	([$supportedTokens, $allIcrcTokens, $balances]) =>
		mapDepositableTokens({
			supportedTokens: $supportedTokens,
			tokens: [...SUPPORTED_ICP_TOKENS, ...$allIcrcTokens],
			hasBalance: (token) => ($balances?.[token.id]?.data ?? ZERO) > ZERO
		})
);
