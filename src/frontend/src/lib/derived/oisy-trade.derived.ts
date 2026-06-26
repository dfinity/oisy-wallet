import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import { SUPPORTED_ICP_TOKENS } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import { allIcrcTokens } from '$lib/derived/all-tokens.derived';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
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
