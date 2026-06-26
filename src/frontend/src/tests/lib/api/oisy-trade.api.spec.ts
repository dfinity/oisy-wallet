import type {
	DepositRequest,
	DepositResponse,
	Token,
	TradingPairInfo,
	UserTokenBalance,
	WithdrawRequest,
	WithdrawResponse
} from '$declarations/oisy_trade/oisy_trade.did';
import {
	deposit,
	getBalances,
	getTradingPairs,
	listSupportedTokens,
	withdraw
} from '$lib/api/oisy-trade.api';
import { OisyTradeCanister } from '$lib/canisters/oisy-trade.canister';
import { ZERO } from '$lib/constants/app.constants';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('oisy-trade.api', () => {
	const oisyTradeCanisterMock = mock<OisyTradeCanister>();

	const tokenId = { ledger_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') };

	const pairs = [{ tick_size: 1n }] as unknown as TradingPairInfo[];
	const supportedTokens = [{ metadata: { symbol: 'ICP' } }] as unknown as Token[];
	const balances = [{ balance: { free: 1n, reserved: ZERO } }] as unknown as UserTokenBalance[];

	const request: DepositRequest = {
		token_id: tokenId,
		amount: 100n
	};
	const depositResponse: DepositResponse = { block_index: 7n };

	beforeEach(() => {
		vi.clearAllMocks();

		// eslint-disable-next-line require-await
		vi.spyOn(OisyTradeCanister, 'create').mockImplementation(async () => oisyTradeCanisterMock);
	});

	describe('getTradingPairs', () => {
		it('delegates to the canister and returns its result', async () => {
			oisyTradeCanisterMock.getTradingPairs.mockResolvedValue(pairs);

			const result = await getTradingPairs({
				identity: mockIdentity,
				canisterId: mockLedgerCanisterId
			});

			expect(result).toEqual(pairs);
			expect(oisyTradeCanisterMock.getTradingPairs).toHaveBeenCalledOnce();
		});

		it('throws when the identity is nullish', async () => {
			await expect(getTradingPairs({ identity: null })).rejects.toThrow();
			expect(oisyTradeCanisterMock.getTradingPairs).not.toHaveBeenCalled();
		});
	});

	describe('listSupportedTokens', () => {
		it('delegates to the canister and returns its result', async () => {
			oisyTradeCanisterMock.listSupportedTokens.mockResolvedValue(supportedTokens);

			const result = await listSupportedTokens({
				identity: mockIdentity,
				canisterId: mockLedgerCanisterId
			});

			expect(result).toEqual(supportedTokens);
			expect(oisyTradeCanisterMock.listSupportedTokens).toHaveBeenCalledOnce();
		});

		it('throws when the identity is nullish', async () => {
			await expect(listSupportedTokens({ identity: null })).rejects.toThrow();
			expect(oisyTradeCanisterMock.listSupportedTokens).not.toHaveBeenCalled();
		});
	});

	describe('getBalances', () => {
		it('delegates to the canister and returns its result', async () => {
			oisyTradeCanisterMock.getBalances.mockResolvedValue(balances);

			const result = await getBalances({
				identity: mockIdentity,
				canisterId: mockLedgerCanisterId
			});

			expect(result).toEqual(balances);
			expect(oisyTradeCanisterMock.getBalances).toHaveBeenCalledOnce();
		});

		it('throws when the identity is nullish', async () => {
			await expect(getBalances({ identity: null })).rejects.toThrow();
			expect(oisyTradeCanisterMock.getBalances).not.toHaveBeenCalled();
		});
	});

	describe('deposit', () => {
		it('forwards the request to the canister and returns its result', async () => {
			oisyTradeCanisterMock.deposit.mockResolvedValue(depositResponse);

			const result = await deposit({
				identity: mockIdentity,
				request,
				canisterId: mockLedgerCanisterId
			});

			expect(result).toEqual(depositResponse);
			expect(oisyTradeCanisterMock.deposit).toHaveBeenCalledWith(request);
		});

		it('throws when the identity is nullish', async () => {
			await expect(deposit({ identity: null, request })).rejects.toThrow();
			expect(oisyTradeCanisterMock.deposit).not.toHaveBeenCalled();
		});
	});

	describe('withdraw', () => {
		const withdrawRequest: WithdrawRequest = { token_id: tokenId, amount: 150_000_000n };
		const response: WithdrawResponse = { block_index: 42n };

		it('delegates to the canister with the request', async () => {
			oisyTradeCanisterMock.withdraw.mockResolvedValue(response);

			const result = await withdraw({
				identity: mockIdentity,
				request: withdrawRequest,
				canisterId: mockLedgerCanisterId
			});

			expect(result).toEqual(response);
			expect(oisyTradeCanisterMock.withdraw).toHaveBeenCalledExactlyOnceWith(withdrawRequest);
		});

		it('throws when the identity is nullish', async () => {
			await expect(withdraw({ identity: null, request: withdrawRequest })).rejects.toThrow();
			expect(oisyTradeCanisterMock.withdraw).not.toHaveBeenCalled();
		});
	});
});
