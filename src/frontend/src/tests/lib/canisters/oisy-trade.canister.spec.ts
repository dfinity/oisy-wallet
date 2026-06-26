import type {
	DepositRequest,
	DepositResponse,
	GetBalancesResult,
	_SERVICE as OisyTradeService,
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import { OisyTradeCanister } from '$lib/canisters/oisy-trade.canister';
import { ZERO } from '$lib/constants/app.constants';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
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
			canisterId: Principal.fromText('4mmnk-kiaaa-aaaag-qbllq-cai'),
			identity: mockIdentity,
			serviceOverride,
			certifiedServiceOverride: serviceOverride
		});

	const service = mock<ActorSubclass<OisyTradeService>>();
	const mockResponseError = new Error('OISY TRADE error');

	const pairs = [{ tick_size: 1n }] as unknown as TradingPairInfo[];
	const supportedTokens = [{ metadata: { symbol: 'ICP' } }] as unknown as Token[];
	const balances = [{ balance: { free: 1n, reserved: ZERO } }] as unknown as UserTokenBalance[];

	const request: DepositRequest = {
		token_id: { ledger_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') },
		amount: 100n
	};
	const depositResponse: DepositResponse = { block_index: 7n };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getTradingPairs', () => {
		it('returns the trading pairs from the uncertified service', async () => {
			service.get_trading_pairs.mockResolvedValue(pairs);

			const { getTradingPairs } = await createOisyTradeCanister({ serviceOverride: service });

			const result = await getTradingPairs();

			expect(result).toEqual(pairs);
			expect(service.get_trading_pairs).toHaveBeenCalledExactlyOnceWith();
		});

		it('throws when the service rejects', async () => {
			service.get_trading_pairs.mockRejectedValue(mockResponseError);

			const { getTradingPairs } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getTradingPairs()).rejects.toThrow(mockResponseError);
		});
	});

	describe('listSupportedTokens', () => {
		it('returns the supported tokens from the uncertified service', async () => {
			service.list_supported_tokens.mockResolvedValue(supportedTokens);

			const { listSupportedTokens } = await createOisyTradeCanister({ serviceOverride: service });

			const result = await listSupportedTokens();

			expect(result).toEqual(supportedTokens);
			expect(service.list_supported_tokens).toHaveBeenCalledExactlyOnceWith();
		});

		it('throws when the service rejects', async () => {
			service.list_supported_tokens.mockRejectedValue(mockResponseError);

			const { listSupportedTokens } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(listSupportedTokens()).rejects.toThrow(mockResponseError);
		});
	});

	describe('getBalances', () => {
		it('passes an empty filter and unwraps the Ok variant', async () => {
			const okResult: GetBalancesResult = { Ok: balances };
			service.get_balances.mockResolvedValue(okResult);

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			const result = await getBalances();

			expect(result).toEqual(balances);
			expect(service.get_balances).toHaveBeenCalledWith([]);
		});

		it('throws the canister message when the Err variant carries one', async () => {
			const errResult = {
				Err: { kind: { TemporaryError: [] }, message: toNullable('balances unavailable') }
			} as unknown as GetBalancesResult;
			service.get_balances.mockResolvedValue(errResult);

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).rejects.toThrow('balances unavailable');
		});

		it('falls back to the kind discriminant when the Err message is empty', async () => {
			const errResult = {
				Err: { kind: { TemporaryError: [] }, message: toNullable<string>(undefined) }
			} as unknown as GetBalancesResult;
			service.get_balances.mockResolvedValue(errResult);

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).rejects.toThrow('TemporaryError');
		});

		it('throws when the service rejects', async () => {
			service.get_balances.mockRejectedValue(mockResponseError);

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).rejects.toThrow(mockResponseError);
		});
	});

	describe('deposit', () => {
		it('forwards the request to the certified service and unwraps the Ok variant', async () => {
			service.deposit.mockResolvedValue({ Ok: depositResponse });

			const { deposit } = await createOisyTradeCanister({ serviceOverride: service });

			const result = await deposit(request);

			expect(result).toEqual(depositResponse);
			expect(service.deposit).toHaveBeenCalledWith(request);
		});

		it('throws the canister message when the Err variant carries one', async () => {
			service.deposit.mockResolvedValue({
				Err: { kind: { InvalidRequest: [] }, message: toNullable('amount too small') }
			} as unknown as Awaited<ReturnType<typeof service.deposit>>);

			const { deposit } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(deposit(request)).rejects.toThrow('amount too small');
		});

		it('falls back to the kind discriminant when the Err message is empty', async () => {
			service.deposit.mockResolvedValue({
				Err: { kind: { InvalidRequest: [] }, message: toNullable<string>(undefined) }
			} as unknown as Awaited<ReturnType<typeof service.deposit>>);

			const { deposit } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(deposit(request)).rejects.toThrow('InvalidRequest');
		});

		it('throws when the service rejects', async () => {
			service.deposit.mockRejectedValue(mockResponseError);

			const { deposit } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(deposit(request)).rejects.toThrow(mockResponseError);
		});
	});
});
