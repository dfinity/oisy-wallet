import type { _SERVICE as KongBackendService } from '$declarations/kong_backend/kong_backend.did';
import {
	IC_CKETH_INDEX_CANISTER_ID,
	IC_CKETH_LEDGER_CANISTER_ID,
	IC_CKETH_MINTER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcCkToken } from '$icp/types/ic-token';
import { CanisterInternalError } from '$lib/canisters/errors';
import { KongBackendCanister } from '$lib/canisters/kong_backend.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { HttpAgent, type ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';
import { mock } from 'vitest-mock-extended';

vi.mock(import('$lib/constants/app.constants'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		LOCAL: false
	};
});

vi.mock(import('$lib/actors/agents.ic'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		// eslint-disable-next-line require-await
		getAgent: async () => mock<HttpAgent>()
	};
});

describe('kong_backend.canister', () => {
	const createKongBackendCanister = ({
		serviceOverride
	}: Pick<
		CreateCanisterOptions<KongBackendService>,
		'serviceOverride'
	>): Promise<KongBackendCanister> =>
		KongBackendCanister.create({
			canisterId: Principal.fromText('l4lgk-raaaa-aaaar-qahpq-cai'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});
	const service = mock<ActorSubclass<KongBackendService>>();
	const mockResponseError = new Error('Test response error');

	const sourceAmount = 1000000n;
	const sourceToken = ICP_TOKEN;
	const destinationToken = {
		...ICP_TOKEN,
		standard: 'icrc',
		ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
		indexCanisterId: IC_CKETH_INDEX_CANISTER_ID,
		minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
	} as IcCkToken;
	const swapAmountsParams = {
		sourceAmount,
		sourceToken,
		destinationToken
	};
	const swapParams = {
		destinationToken,
		maxSlippage: 1,
		sendAmount: sourceAmount,
		referredBy: 'referredBy',
		receiveAmount: sourceAmount,
		destinationAddress: 'destinationAddress',
		sourceToken,
		payTransactionId: { TransactionId: '1' }
	};
	const errorResponse = { Err: 'Test error' };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('kongSwapAmounts', () => {
		it('returns correct swap amounts', async () => {
			const response = {
				Ok: {
					txs: [
						{
							gas_fee: 10000n,
							lp_fee: 112499994n,
							pay_address: 'nppha-riaaa-aaaal-ajf2q-cai',
							pay_amount: 10000000000000000000n,
							pay_chain: 'IC',
							pay_symbol: 'ICP',
							pool_symbol: 'ICP_ckUSDT',
							price: 0.00000373875,
							receive_address: 'zdzgz-siaaa-aaaar-qaiba-cai',
							receive_amount: 37387488131n,
							receive_chain: 'IC',
							receive_symbol: 'ckUSDT'
						}
					],
					mid_price: 7.5,
					pay_address: 'nppha-riaaa-aaaal-ajf2q-cai',
					pay_amount: 10000000000000000000n,
					pay_chain: 'IC',
					pay_symbol: 'ICP',
					price: 0.000000373875,
					receive_address: 'zdzgz-siaaa-aaaar-qaiba-cai',
					receive_amount: 37387488131n,
					receive_chain: 'IC',
					receive_symbol: 'ckUSDT',
					slippage: 100
				}
			};
			service.swap_amounts.mockResolvedValue(response);

			const { swapAmounts } = await createKongBackendCanister({
				serviceOverride: service
			});

			const res = await swapAmounts(swapAmountsParams);

			expect(res).toEqual(response.Ok);
			expect(service.swap_amounts).toHaveBeenCalledWith(
				sourceToken.symbol,
				sourceAmount,
				destinationToken.symbol
			);
		});

		it('should throw an error if swap_amounts returns an error', async () => {
			service.swap_amounts.mockResolvedValue(errorResponse);

			const { swapAmounts } = await createKongBackendCanister({
				serviceOverride: service
			});

			const res = swapAmounts(swapAmountsParams);

			await expect(res).rejects.toThrow(new CanisterInternalError(errorResponse.Err));
		});

		it('should throw an error if swap_amounts throws', async () => {
			service.swap_amounts.mockImplementation(() => {
				throw mockResponseError;
			});

			const { swapAmounts } = await createKongBackendCanister({
				serviceOverride: service
			});

			const res = swapAmounts(swapAmountsParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if swap_amounts returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.swap_amounts.mockResolvedValue({ test: 'unexpected' });

			const { swapAmounts } = await createKongBackendCanister({
				serviceOverride: service
			});

			const res = swapAmounts(swapAmountsParams);

			await expect(res).rejects.toThrow();
		});
	});

	describe('kongSwap', () => {
		it('returns correct swap request id', async () => {
			const response = {
				Ok: 1000n
			};
			service.swap_async.mockResolvedValue(response);

			const { swap } = await createKongBackendCanister({
				serviceOverride: service
			});

			const res = await swap(swapParams);

			expect(res).toEqual(response.Ok);
			expect(service.swap_async).toHaveBeenCalledWith({
				pay_token: swapParams.sourceToken.symbol,
				receive_token: swapParams.destinationToken.symbol,
				pay_amount: swapParams.sendAmount,
				max_slippage: toNullable(swapParams.maxSlippage),
				receive_address: toNullable(swapParams.destinationAddress),
				receive_amount: toNullable(swapParams.receiveAmount),
				pay_tx_id: toNullable(swapParams.payTransactionId),
				referred_by: toNullable(swapParams.referredBy)
			});
		});

		it('should throw an error if swap_async returns an error', async () => {
			service.swap_async.mockResolvedValue(errorResponse);

			const { swap } = await createKongBackendCanister({
				serviceOverride: service
			});

			const res = swap(swapParams);

			await expect(res).rejects.toThrow(new CanisterInternalError(errorResponse.Err));
		});

		it('should throw an error if swap_async throws', async () => {
			service.swap_async.mockImplementation(() => {
				throw mockResponseError;
			});

			const { swap } = await createKongBackendCanister({
				serviceOverride: service
			});

			const res = swap(swapParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if swap_async returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.swap_async.mockResolvedValue({ test: 'unexpected' });

			const { swap } = await createKongBackendCanister({
				serviceOverride: service
			});

			const res = swap(swapParams);

			await expect(res).rejects.toThrow();
		});
	});
});
