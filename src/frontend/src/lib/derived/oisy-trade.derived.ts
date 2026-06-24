import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import { icrcTokens } from '$icp/derived/icrc.derived';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { OisyTradeWithdrawToken } from '$lib/types/oisy-trade';
import { toOisyTradeWithdrawTokens } from '$lib/utils/oisy-trade.utils';
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

// DEX balances joined with the matching OISY token, so the Trading tab can offer
// a Withdraw entry per holding with the token pre-resolved.
export const oisyTradeWithdrawTokens: Readable<OisyTradeWithdrawToken[]> = derived(
	[oisyTradeBalances, icrcTokens],
	([$oisyTradeBalances, $icrcTokens]) =>
		toOisyTradeWithdrawTokens({ balances: $oisyTradeBalances, icrcTokens: $icrcTokens })
);
