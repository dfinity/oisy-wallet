import type {
	_SERVICE as OisyTradeService,
	Token,
	TradingPairInfo,
	UserTokenBalance,
	WithdrawRequest,
	WithdrawResponse
} from '$declarations/oisy_trade/oisy_trade.did';
import { OisyTradeCanister } from '$lib/canisters/oisy-trade.canister';
import { ZERO } from '$lib/constants/app.constants';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('oisy-trade.canister', () => {
	const createOisyTradeCanister = ({
		serviceOverride
	}: Pick<
		CreateCanisterOptions<OisyTradeService>,
		'serviceOverride'
	>): Promise<OisyTradeCanister> =>
		OisyTradeCanister.create({
			canisterId: Principal.fromText('vi6cu-aiaaa-aaaad-aad7q-cai'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<OisyTradeService>>();
	const mockResponseError = new Error('Test response error');

	const tokenId = { ledger_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getTradingPairs', () => {
		it('returns the trading pairs', async () => {
			const pairs = [{ tick_size: 1n }] as unknown as TradingPairInfo[];
			service.get_trading_pairs.mockResolvedValue(pairs);

			const { getTradingPairs } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getTradingPairs()).resolves.toEqual(pairs);
			expect(service.get_trading_pairs).toHaveBeenCalledExactlyOnceWith();
		});

		it('throws when get_trading_pairs throws', async () => {
			service.get_trading_pairs.mockRejectedValue(mockResponseError);

			const { getTradingPairs } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getTradingPairs()).rejects.toThrow(mockResponseError);
		});
	});

	describe('listSupportedTokens', () => {
		it('returns the supported tokens', async () => {
			const tokens = [{ metadata: { symbol: 'ICP' } }] as unknown as Token[];
			service.list_supported_tokens.mockResolvedValue(tokens);

			const { listSupportedTokens } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(listSupportedTokens()).resolves.toEqual(tokens);
			expect(service.list_supported_tokens).toHaveBeenCalledExactlyOnceWith();
		});

		it('throws when list_supported_tokens throws', async () => {
			service.list_supported_tokens.mockRejectedValue(mockResponseError);

			const { listSupportedTokens } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(listSupportedTokens()).rejects.toThrow(mockResponseError);
		});
	});

	describe('getBalances', () => {
		const balances = [
			{ token: { id: tokenId }, balance: { free: 10n, reserved: ZERO } }
		] as unknown as UserTokenBalance[];

		it('returns the balances on Ok and passes an empty filter', async () => {
			service.get_balances.mockResolvedValue({ Ok: balances });

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).resolves.toEqual(balances);
			expect(service.get_balances).toHaveBeenCalledExactlyOnceWith([]);
		});

		it('throws the canister message when present on Err', async () => {
			service.get_balances.mockResolvedValue({
				Err: { kind: { InternalError: [] }, message: ['boom'] }
			});

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).rejects.toThrow('boom');
		});

		it('falls back to the kind discriminant when the Err message is empty', async () => {
			service.get_balances.mockResolvedValue({
				Err: { kind: { TemporaryError: [] }, message: [] }
			});

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).rejects.toThrow('TemporaryError');
		});

		it('throws when get_balances throws', async () => {
			service.get_balances.mockRejectedValue(mockResponseError);

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).rejects.toThrow(mockResponseError);
		});
	});

	describe('withdraw', () => {
		const request: WithdrawRequest = { token_id: tokenId, amount: 150_000_000n };
		const response: WithdrawResponse = { block_index: 42n };

		it('returns the response on Ok and forwards the request', async () => {
			service.withdraw.mockResolvedValue({ Ok: response });

			const { withdraw } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(withdraw(request)).resolves.toEqual(response);
			expect(service.withdraw).toHaveBeenCalledExactlyOnceWith(request);
		});

		it('throws the canister message when present on Err', async () => {
			service.withdraw.mockResolvedValue({
				Err: {
					kind: { RequestError: [{ InsufficientBalance: { available: 5n } }] },
					message: ['no funds']
				}
			});

			const { withdraw } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(withdraw(request)).rejects.toThrow('no funds');
		});

		it('falls back to the kind discriminant when the Err message is empty', async () => {
			service.withdraw.mockResolvedValue({
				Err: { kind: { RequestError: [{ AmountExceedsMaximum: null }] }, message: [] }
			});

			const { withdraw } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(withdraw(request)).rejects.toThrow('RequestError');
		});

		it('throws when withdraw throws', async () => {
			service.withdraw.mockRejectedValue(mockResponseError);

			const { withdraw } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(withdraw(request)).rejects.toThrow(mockResponseError);
		});
	});
});
