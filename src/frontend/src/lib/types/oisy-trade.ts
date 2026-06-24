import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';

// Read-side state loaded from the OISY TRADE canister and held in the store.
// `undefined` = not loaded yet (distinct from an empty list).
export interface OisyTradeStoreData {
	pairs: TradingPairInfo[] | undefined;
	supportedTokens: Token[] | undefined;
	balances: UserTokenBalance[] | undefined;
}

// A DEX balance entry paired with the resolved OISY token (for the logo,
// network, decimals and exchange rate the wallet already knows about). Used to
// open the Withdraw flow with the token pre-selected.
export interface OisyTradeWithdrawToken {
	token: IcToken;
	free: bigint;
	reserved: bigint;
}
