import type {
	Token as OisyTradeToken,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import type { ExchangesData } from '$lib/types/exchange';
import type { OisyTradeAsset } from '$lib/types/oisy-trade';
import { calculateTokenUsdAmount } from '$lib/utils/token.utils';
import { nonNullish } from '@dfinity/utils';

// The distinct union of every base and quote token symbol across the trading
// pairs — the set of tokens OISY TRADE supports. Used for the onboarding chips
// and the deposit "nothing to deposit" empty state.
export const oisyTradeSupportedTokenSymbols = (pairs: TradingPairInfo[]): string[] => [
	...new Set(pairs.flatMap(({ base, quote }) => [base.metadata.symbol, quote.metadata.symbol]))
];

// Resolves the DEX balances (keyed by ledger canister principal) to OISY tokens
// and enriches them with totals and fiat values. Balances whose ledger we don't
// know are dropped — we can't render a row without the token's metadata/icon.
export const mapOisyTradeAssets = ({
	balances,
	tokens,
	exchanges
}: {
	balances: UserTokenBalance[];
	tokens: IcToken[];
	exchanges: ExchangesData;
}): OisyTradeAsset[] => {
	const tokenByLedgerId = new Map(tokens.map((token) => [token.ledgerCanisterId, token]));

	return balances.reduce<OisyTradeAsset[]>((acc, { token: dexToken, balance }) => {
		const token = tokenByLedgerId.get(dexToken.id.ledger_id.toText());

		if (token === undefined) {
			return acc;
		}

		const { free, reserved } = balance;
		const total = free + reserved;

		acc.push({
			token,
			free,
			reserved,
			total,
			totalUsd: calculateTokenUsdAmount({ amount: total, token, $exchanges: exchanges }),
			freeUsd: calculateTokenUsdAmount({ amount: free, token, $exchanges: exchanges })
		});

		return acc;
	}, []);
};

// Total fiat value of all DEX-deposited balances (free + reserved), to add to
// the hero net-worth total.
export const sumOisyTradeAssetsUsd = (assets: OisyTradeAsset[]): number =>
	assets.reduce((acc, { totalUsd }) => acc + (totalUsd ?? 0), 0);

// The OISY tokens the user can deposit: DEX-supported tokens (matched by ledger
// canister id) that the user holds in their wallet. The first token per ledger id
// wins (the combined list is ordered ICP → ICRC default → custom).
export const oisyTradeDepositableTokens = ({
	supportedTokens,
	tokens,
	hasBalance
}: {
	supportedTokens: OisyTradeToken[];
	tokens: IcToken[];
	hasBalance: (token: IcToken) => boolean;
}): IcToken[] => {
	// Resolve by ledger canister id (like Send and the order form), NOT by symbol,
	// so a token's exact network/identity is preserved (e.g. a staging/testnet
	// ledger isn't collapsed onto its mainnet namesake). Deduped by ledger id.
	const byLedgerId = new Map(tokens.map((token) => [token.ledgerCanisterId, token]));
	const seen = new Set<string>();

	return supportedTokens.reduce<IcToken[]>((acc, { id: { ledger_id } }) => {
		const token = byLedgerId.get(ledger_id.toText());

		if (nonNullish(token) && !seen.has(token.ledgerCanisterId) && hasBalance(token)) {
			seen.add(token.ledgerCanisterId);
			acc.push(token);
		}

		return acc;
	}, []);
};

// True when at least one balance is reserved by an open order, i.e. the
// "Available" line should be shown (available < total).
export const oisyTradeAssetHasReserved = ({ reserved }: OisyTradeAsset): boolean => reserved > ZERO;
