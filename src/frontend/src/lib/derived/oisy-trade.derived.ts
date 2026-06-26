import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import { SUPPORTED_ICP_TOKENS } from '$env/tokens/tokens.icp.env';
import { icrcTokens } from '$icp/derived/icrc.derived';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import { allIcrcTokens } from '$lib/derived/all-tokens.derived';
import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { OisyTradeAsset, OisyTradeWithdrawToken } from '$lib/types/oisy-trade';
import {
	oisyTradeDepositableTokens as mapDepositableTokens,
	mapOisyTradeAssets,
	oisyTradeSupportedTokenSymbols as mapSupportedTokenSymbols,
	sumOisyTradeAssetsUsd,
	toOisyTradeWithdrawTokens
} from '$lib/utils/oisy-trade.utils';
import { nonNullish } from '@dfinity/utils';
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

// DEX balances joined with the matching OISY token, so the Trading tab can offer
// a Withdraw entry per holding with the token pre-resolved.
export const oisyTradeWithdrawTokens: Readable<OisyTradeWithdrawToken[]> = derived(
	[oisyTradeBalances, icrcTokens],
	([$oisyTradeBalances, $icrcTokens]) =>
		toOisyTradeWithdrawTokens({ balances: $oisyTradeBalances, icrcTokens: $icrcTokens })
);

// The supported trade tokens resolved to their matching app `IcToken` (by ledger
// canister id), keyed by symbol. The trade canister exposes only symbol/decimals,
// so the form joins against `allIcrcTokens` (+ the built-in ICP tokens, which are
// not part of `allIcrcTokens`) to recover the logo, name, network and standard the
// shared `TokenInput` needs. This is the same resolution inlined in
// `LimitOrderTokensList`, surfaced here so the form can thread the real token.
export const oisyTradeIcTokenBySymbol: Readable<Record<string, IcToken>> = derived(
	[oisyTradeSupportedTokens, allIcrcTokens],
	([$supportedTokens, $allIcrcTokens]) => {
		const byLedger = [...$allIcrcTokens, ...SUPPORTED_ICP_TOKENS].reduce<Record<string, IcToken>>(
			(acc, token) => ({ ...acc, [token.ledgerCanisterId]: token }),
			{}
		);

		return $supportedTokens.reduce<Record<string, IcToken>>((acc, tradeToken) => {
			const { symbol } = tradeToken.metadata;
			if (symbol in acc) {
				return acc;
			}
			const token = byLedger[tradeToken.id.ledger_id.toText()];
			return nonNullish(token) ? { ...acc, [symbol]: token } : acc;
		}, {});
	}
);

// Free DEX balance per token symbol, in human units (smallest units scaled by
// the token's own decimals). Keyed by symbol so the limit-order form can look
// up the spend/receive balances for the chosen base/quote.
export const oisyTradeFreeBalanceBySymbol: Readable<Record<string, number>> = derived(
	oisyTradeBalances,
	($balances) =>
		$balances.reduce<Record<string, number>>((acc, { token, balance }) => {
			acc[token.metadata.symbol] = Number(balance.free) / 10 ** token.metadata.decimals;
			return acc;
		}, {})
);
