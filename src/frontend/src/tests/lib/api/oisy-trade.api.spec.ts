import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import { getBalances, getTradingPairs, listSupportedTokens } from '$lib/api/oisy-trade.api';
import { OisyTradeCanister } from '$lib/canisters/oisy-trade.canister';
import * as appConstants from '$lib/constants/app.constants';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('oisy-trade.api', () => {
	const oisyTradeCanisterMock = mock<OisyTradeCanister>();
	const token: Token = {
		id: { ledger_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') },
		metadata: {
			decimals: 8,
			symbol: 'ckBTC'
		}
	};
	const tradingPairs: TradingPairInfo[] = [
		{
			status: { Trading: null },
			base: token,
			quote: token,
			min_notional: 1_000n,
			lot_size: 100n,
			taker_fee_bps: 10,
			maker_fee_bps: 5,
			tick_size: 1n,
			max_notional: []
		}
	];
	const balances: UserTokenBalance[] = [
		{
			token,
			balance: {
				free: 1_000n,
				reserved: 250n
			}
		}
	];

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(OisyTradeCanister, 'create').mockResolvedValue(oisyTradeCanisterMock);
		vi.spyOn(appConstants, 'OISY_TRADE_CANISTER_ID', 'get').mockImplementation(
			() => mockLedgerCanisterId
		);
	});

	describe('getTradingPairs', () => {
		it('should call the canister with the default canister id', async () => {
			oisyTradeCanisterMock.getTradingPairs.mockResolvedValue(tradingPairs);

			await expect(getTradingPairs({ identity: mockIdentity })).resolves.toBe(tradingPairs);
			expect(oisyTradeCanisterMock.getTradingPairs).toHaveBeenCalledExactlyOnceWith();
			expect(OisyTradeCanister.create).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: Principal.fromText(mockLedgerCanisterId)
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(getTradingPairs({ identity: undefined })).rejects.toThrow();
			expect(oisyTradeCanisterMock.getTradingPairs).not.toHaveBeenCalled();
		});
	});

	describe('listSupportedTokens', () => {
		it('should call the canister list supported tokens method', async () => {
			oisyTradeCanisterMock.listSupportedTokens.mockResolvedValue([token]);

			await expect(listSupportedTokens({ identity: mockIdentity })).resolves.toEqual([token]);
			expect(oisyTradeCanisterMock.listSupportedTokens).toHaveBeenCalledExactlyOnceWith();
		});
	});

	describe('getBalances', () => {
		it('should call the canister balances method', async () => {
			oisyTradeCanisterMock.getBalances.mockResolvedValue(balances);

			await expect(getBalances({ identity: mockIdentity })).resolves.toBe(balances);
			expect(oisyTradeCanisterMock.getBalances).toHaveBeenCalledExactlyOnceWith();
		});
	});
});
