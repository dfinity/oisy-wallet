import type { UserTokenBalance } from '$declarations/oisy_trade/oisy_trade.did';
import { ZERO } from '$lib/constants/app.constants';
import { toOisyTradeWithdrawTokens } from '$lib/utils/oisy-trade.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';

describe('oisy-trade.utils', () => {
	describe('toOisyTradeWithdrawTokens', () => {
		const dexBalance = (
			ledgerCanisterId: string,
			free: bigint,
			reserved: bigint
		): UserTokenBalance =>
			({
				token: { id: { ledger_id: Principal.fromText(ledgerCanisterId) } },
				balance: { free, reserved }
			}) as unknown as UserTokenBalance;

		it('pairs a DEX balance with the matching OISY token by ledger canister id', () => {
			const result = toOisyTradeWithdrawTokens({
				balances: [dexBalance(mockValidIcToken.ledgerCanisterId, 10n, 3n)],
				icrcTokens: [mockValidIcToken]
			});

			expect(result).toEqual([{ token: mockValidIcToken, free: 10n, reserved: 3n }]);
		});

		it('drops balances whose ledger is unknown to the wallet', () => {
			const result = toOisyTradeWithdrawTokens({
				balances: [dexBalance('ryjl3-tyaaa-aaaaa-aaaba-cai', 10n, ZERO)],
				icrcTokens: [mockValidIcToken]
			});

			expect(result).toEqual([]);
		});
	});
});
