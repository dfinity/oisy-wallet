import type { UserTokenBalance } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import type { OisyTradeWithdrawToken } from '$lib/types/oisy-trade';
import { nonNullish } from '@dfinity/utils';

// Pairs each DEX balance with the OISY token sharing its ledger canister id, so
// the wallet's logo, network, decimals and exchange rate can be reused. Entries
// whose ledger is unknown to the wallet are dropped (nothing to display them
// with). Used to drive the Trading-tab "Withdraw" entry points.
export const toOisyTradeWithdrawTokens = ({
	balances,
	icrcTokens
}: {
	balances: UserTokenBalance[];
	icrcTokens: IcToken[];
}): OisyTradeWithdrawToken[] => {
	const tokenByLedgerCanisterId = new Map(
		icrcTokens.map((token) => [token.ledgerCanisterId, token])
	);

	return balances
		.map(({ token: { id }, balance: { free, reserved } }) => {
			const token = tokenByLedgerCanisterId.get(id.ledger_id.toText());

			return nonNullish(token) ? { token, free, reserved } : undefined;
		})
		.filter(nonNullish);
};
