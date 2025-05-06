import {
	deposit,
	depositFrom,
	getIcpSwapAmounts,
	getPool,
	getQuote,
	getUserUnusedBalance,
	swap,
	withdraw
} from '$lib/api/icp-swap.api';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';

import type { IcToken } from '$icp/types/ic-token';
import {
	depositFromMock,
	depositMock,
	factoryCreateMock,
	getPoolMock,
	getUserUnusedBalanceMock,
	mockPoolData,
	poolCreateMock,
	quoteMock,
	swapMock,
	withdrawMock
} from '$tests/mocks/icp-swap.mock';

vi.mock('$lib/constants/app.constants', () => ({
	ICP_SWAP_CANISTER_ID: '4mmnk-kiaaa-aaaag-qbllq-cai'
}));

vi.mock('$lib/canisters/icp-swap-factory.canister', () => import('$tests/mocks/icp-swap.mock'));

vi.mock('$lib/canisters/icp-swap-pool.canister', () => import('$tests/mocks/icp-swap.mock'));

describe('icpSwapApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getPool', () => {
		const params = {
			identity: mockIdentity,
			token0: { address: 'token0', standard: 'standard0' },
			token1: { address: 'token1', standard: 'standard1' },
			fee: 1000n,
			canisterId: 'aaaaa-aa'
		};

		it('should call factory to get pool and return data', async () => {
			const result = await getPool(params);

			expect(factoryCreateMock).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: Principal.fromText('aaaaa-aa')
			});

			expect(getPoolMock).toHaveBeenCalledWith({
				token0: params.token0,
				token1: params.token1,
				fee: params.fee
			});

			expect(result).toEqual(mockPoolData);
		});

		it('should handle factory errors', async () => {
			factoryCreateMock.mockRejectedValueOnce(new Error('Factory error'));

			await expect(getPool(params)).rejects.toThrow('Factory error');
		});
	});

	describe('getQuote', () => {
		const params = {
			identity: mockIdentity,
			canisterId: 'aaaaa-aa',
			amountIn: '10',
			zeroForOne: true,
			amountOutMinimum: '0'
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call pool to get quote and return amount', async () => {
			const result = await getQuote(params);

			expect(poolCreateMock).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: Principal.fromText('aaaaa-aa')
			});
			expect(quoteMock).toHaveBeenCalledWith({
				amountIn: '10',
				zeroForOne: true,
				amountOutMinimum: '0'
			});
			expect(result).toBe(100n);
		});

		it('should throw if canisterId or identity is missing', async () => {
			await expect(getQuote({ ...params, canisterId: undefined })).rejects.toThrow(
				'Missing pool canister ID'
			);
			await expect(getQuote({ ...params, identity: undefined })).rejects.toThrow(
				'Identity is required'
			);
		});

		it('should handle pool errors', async () => {
			poolCreateMock.mockRejectedValueOnce(new Error('Pool error'));

			await expect(getQuote(params)).rejects.toThrow('Pool error');
		});
	});

	describe('swap', () => {
		const params = {
			identity: mockIdentity,
			canisterId: 'aaaaa-aa',
			amountIn: '10',
			zeroForOne: false,
			amountOutMinimum: '1'
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call pool to perform swap and return result', async () => {
			const result = await swap(params);

			expect(poolCreateMock).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: Principal.fromText('aaaaa-aa')
			});

			expect(swapMock).toHaveBeenCalledWith({
				amountIn: '10',
				zeroForOne: false,
				amountOutMinimum: '1'
			});

			expect(result).toBe(99n);
		});

		it('should throw if canisterId or identity is missing', async () => {
			await expect(swap({ ...params, canisterId: undefined })).rejects.toThrow(
				'Missing pool canister ID'
			);
			await expect(swap({ ...params, identity: undefined })).rejects.toThrow(
				'Identity is required'
			);
		});

		it('should handle pool errors', async () => {
			poolCreateMock.mockRejectedValueOnce(new Error('Pool error'));

			await expect(swap(params)).rejects.toThrow('Pool error');
		});
	});

	describe('deposit', () => {
		const params = {
			identity: mockIdentity,
			canisterId: 'aaaaa-aa',
			token: 'token_address',
			amount: 100n,
			fee: 1n
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call pool to deposit and return result', async () => {
			const result = await deposit(params);

			expect(poolCreateMock).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: Principal.fromText('aaaaa-aa')
			});

			expect(depositMock).toHaveBeenCalledWith({
				token: 'token_address',
				amount: 100n,
				fee: 1n
			});

			expect(result).toBe(1000n);
		});

		it('should throw if canisterId or identity is missing', async () => {
			await expect(deposit({ ...params, canisterId: undefined })).rejects.toThrow(
				'Missing pool canister ID'
			);
			await expect(deposit({ ...params, identity: undefined })).rejects.toThrow(
				'Identity is required'
			);
		});

		it('should handle pool errors', async () => {
			poolCreateMock.mockRejectedValueOnce(new Error('Pool error'));

			await expect(deposit(params)).rejects.toThrow('Pool error');
		});
	});

	describe('depositFrom', () => {
		const params = {
			identity: mockIdentity,
			canisterId: 'aaaaa-aa',
			token: 'token_address',
			amount: 100n,
			fee: 1n
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call pool to depositFrom and return result', async () => {
			const result = await depositFrom(params);

			expect(poolCreateMock).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: Principal.fromText('aaaaa-aa')
			});

			expect(depositFromMock).toHaveBeenCalledWith({
				token: 'token_address',
				amount: 100n,
				fee: 1n
			});

			expect(result).toBe(1000n);
		});

		it('should throw if canisterId or identity is missing', async () => {
			await expect(depositFrom({ ...params, canisterId: undefined })).rejects.toThrow(
				'Missing pool canister ID'
			);
			await expect(depositFrom({ ...params, identity: undefined })).rejects.toThrow(
				'Identity is required'
			);
		});

		it('should handle pool errors', async () => {
			poolCreateMock.mockRejectedValueOnce(new Error('Pool error'));

			await expect(depositFrom(params)).rejects.toThrow('Pool error');
		});
	});

	describe('withdraw', () => {
		const params = {
			identity: mockIdentity,
			canisterId: 'aaaaa-aa',
			token: 'another_token',
			amount: 50n,
			fee: 0n
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call pool to withdraw and return result', async () => {
			const result = await withdraw(params);

			expect(poolCreateMock).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: Principal.fromText('aaaaa-aa')
			});

			expect(withdrawMock).toHaveBeenCalledWith({
				token: 'another_token',
				amount: 50n,
				fee: 0n
			});

			expect(result).toBe(50n);
		});

		it('should throw if canisterId or identity is missing', async () => {
			await expect(withdraw({ ...params, canisterId: undefined })).rejects.toThrow(
				'Missing pool canister ID'
			);
			await expect(withdraw({ ...params, identity: undefined })).rejects.toThrow(
				'Identity is required'
			);
		});

		it('should handle pool errors', async () => {
			poolCreateMock.mockRejectedValueOnce(new Error('Pool error'));

			await expect(withdraw(params)).rejects.toThrow('Pool error');
		});
	});

	describe('getUserUnusedBalance', () => {
		const params = {
			identity: mockIdentity,
			canisterId: 'aaaaa-aa',
			principal: Principal.fromText('aaaaa-aa')
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call pool to get unused balance and return it', async () => {
			const result = await getUserUnusedBalance(params);

			expect(poolCreateMock).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: Principal.fromText('aaaaa-aa')
			});

			expect(getUserUnusedBalanceMock).toHaveBeenCalledWith(params.principal);
			expect(result).toEqual({ balance0: 20n, balance1: 30n });
		});

		it('should throw if canisterId or identity is missing', async () => {
			await expect(getUserUnusedBalance({ ...params, canisterId: undefined })).rejects.toThrow(
				'Missing pool canister ID'
			);

			await expect(getUserUnusedBalance({ ...params, identity: undefined })).rejects.toThrow(
				'Identity is required'
			);
		});

		it('should handle pool errors', async () => {
			poolCreateMock.mockRejectedValueOnce(new Error('Pool error'));

			await expect(getUserUnusedBalance(params)).rejects.toThrow('Pool error');
		});
	});

	describe('getIcpSwapAmounts', () => {
		const baseParams = {
			identity: mockIdentity,
			sourceToken: { ledgerCanisterId: 'token0_address', standard: 'icrc' } as IcToken,
			destinationToken: { ledgerCanisterId: 'token1_address', standard: 'icrc' } as IcToken,
			sourceAmount: 10n,
			fee: 3000n
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call getPool and getQuote and return receive amount', async () => {
			const result = await getIcpSwapAmounts(baseParams);

			expect(factoryCreateMock).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: Principal.fromText('4mmnk-kiaaa-aaaag-qbllq-cai')
			});

			expect(getPoolMock).toHaveBeenCalledWith({
				token0: {
					address: baseParams.sourceToken.ledgerCanisterId,
					standard: baseParams.sourceToken.standard
				},
				token1: {
					address: baseParams.destinationToken.ledgerCanisterId,
					standard: baseParams.destinationToken.standard
				},
				fee: 3000n
			});

			expect(poolCreateMock).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: Principal.fromText('aaaaa-aa')
			});

			expect(quoteMock).toHaveBeenCalledWith({
				amountIn: '10',
				zeroForOne: true,
				amountOutMinimum: '0'
			});

			expect(result).toEqual({ receiveAmount: 100n });
		});

		it('should throw if getPool returns null', async () => {
			getPoolMock.mockResolvedValueOnce(null);

			await expect(getIcpSwapAmounts(baseParams)).rejects.toThrow('Pool not found');
		});

		it('should handle errors in getPool or getQuote', async () => {
			factoryCreateMock.mockRejectedValueOnce(new Error('Factory error'));

			await expect(getIcpSwapAmounts(baseParams)).rejects.toThrow('Factory error');

			factoryCreateMock.mockResolvedValueOnce({ getPool: getPoolMock });
			poolCreateMock.mockRejectedValueOnce(new Error('Pool error'));

			await expect(getIcpSwapAmounts(baseParams)).rejects.toThrow('Pool error');
		});
	});
});
