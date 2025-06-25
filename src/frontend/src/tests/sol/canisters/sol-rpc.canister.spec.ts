import type {
	GetAccountInfoResult,
	MultiGetAccountInfoResult,
	RpcError,
	RpcSource,
	_SERVICE as SolRpcService
} from '$declarations/sol_rpc/sol_rpc.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { SolRpcCanister, networkToCluster } from '$sol/canisters/sol-rpc.canister';
import { JSON_PARSED, SOL_RPC_CONFIG } from '$sol/canisters/sol-rpc.constants';
import { SolRpcCanisterError } from '$sol/canisters/sol-rpc.errors';
import { SOLANA_NETWORK_TYPES } from '$sol/schema/network.schema';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockAccountInfo } from '$tests/mocks/sol-rpc.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import type { ActorSubclass } from '@dfinity/agent';
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

describe('sol-rpc.canister', () => {
	const createSolRpcCanister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<SolRpcService>, 'serviceOverride'>): Promise<SolRpcCanister> =>
		SolRpcCanister.create({
			canisterId: Principal.fromText('tghme-zyaaa-aaaar-qarca-cai'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});
	const service = mock<ActorSubclass<SolRpcService>>();

	const mockResponseError = new Error('Test response error');

	const genericErrorResponse = { Err: { CanisterError: null } };

	const expectedInconsistentErrorResponse = new Error('Sol RPC response should be consistent');
	const expectedUnknownRpcError = new CanisterInternalError('Unknown SOL RPC Error');
	const expectedUnknownNetworkError = new Error('Unknown network: unknown-network');

	const address = mockSolAddress;

	const expectedCallParams = {
		encoding: JSON_PARSED,
		dataSlice: toNullable(),
		minContextSlot: toNullable(),
		commitment: toNullable()
	};

	const mockRpcSource: RpcSource = { Supported: { PublicNodeMainnet: null } };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getAccountInfo', () => {
		describe.each(SOLANA_NETWORK_TYPES)(`with network %s`, (network) => {
			const networkCluster = networkToCluster(network);
			const mockParams = { address, network };

			const mockResult: GetAccountInfoResult = { Ok: toNullable(mockAccountInfo) };
			const mockResponse: MultiGetAccountInfoResult = { Consistent: mockResult };

			it('returns correct account info address', async () => {
				service.getAccountInfo.mockResolvedValue(mockResponse);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				const res = await getAccountInfo(mockParams);

				expect(res).toEqual(mockAccountInfo);

				expect(service.getAccountInfo).toHaveBeenCalledExactlyOnceWith(
					{ Default: networkCluster },
					SOL_RPC_CONFIG,
					{ ...expectedCallParams, pubkey: address }
				);
			});

			it('should throw an error if getAccountInfo returns a JsonRpcError error', async () => {
				const error: RpcError = {
					JsonRpcError: { code: -123n, message: 'Internal error' }
				};
				const errorResponse: MultiGetAccountInfoResult = { Consistent: { Err: error } };

				service.getAccountInfo.mockResolvedValue(errorResponse);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				await expect(getAccountInfo(mockParams)).rejects.toThrow(new SolRpcCanisterError(error));
			});

			it('should throw an error if getAccountInfo returns a ProviderError.TooFewCycles error', async () => {
				const error: RpcError = {
					ProviderError: {
						TooFewCycles: { expected: 1_000_000n, received: 123n }
					}
				};
				const errorResponse: MultiGetAccountInfoResult = { Consistent: { Err: error } };

				service.getAccountInfo.mockResolvedValue(errorResponse);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				await expect(getAccountInfo(mockParams)).rejects.toThrow(new SolRpcCanisterError(error));
			});

			it('should throw an error if getAccountInfo returns a ProviderError.InvalidRpcConfig error', async () => {
				const error: RpcError = {
					ProviderError: {
						InvalidRpcConfig: 'Missing cluster endpoint'
					}
				};
				const errorResponse: MultiGetAccountInfoResult = { Consistent: { Err: error } };

				service.getAccountInfo.mockResolvedValue(errorResponse);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				await expect(getAccountInfo(mockParams)).rejects.toThrow(new SolRpcCanisterError(error));
			});

			it('should throw an error if getAccountInfo returns a ProviderError.UnsupportedCluster error', async () => {
				const error: RpcError = {
					ProviderError: {
						UnsupportedCluster: 'testnet-unsupported'
					}
				};
				const errorResponse: MultiGetAccountInfoResult = { Consistent: { Err: error } };

				service.getAccountInfo.mockResolvedValue(errorResponse);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				await expect(getAccountInfo(mockParams)).rejects.toThrow(new SolRpcCanisterError(error));
			});

			it('should throw an error if getAccountInfo returns a ValidationError error', async () => {
				const error: RpcError = { ValidationError: 'Invalid pubkey format' };
				const errorResponse: MultiGetAccountInfoResult = { Consistent: { Err: error } };

				service.getAccountInfo.mockResolvedValue(errorResponse);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				await expect(getAccountInfo(mockParams)).rejects.toThrow(new SolRpcCanisterError(error));
			});

			it('should throw an error if getAccountInfo returns an HttpOutcallError.IcError error', async () => {
				const error: RpcError = {
					HttpOutcallError: {
						IcError: { code: { CanisterError: null }, message: 'IC internal failure' }
					}
				};
				const errorResponse: MultiGetAccountInfoResult = { Consistent: { Err: error } };

				service.getAccountInfo.mockResolvedValue(errorResponse);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				await expect(getAccountInfo(mockParams)).rejects.toThrow(new SolRpcCanisterError(error));
			});

			it('should throw an error if getAccountInfo returns an HttpOutcallError.InvalidHttpJsonRpcResponse error', async () => {
				const error: RpcError = {
					HttpOutcallError: {
						InvalidHttpJsonRpcResponse: {
							status: 502,
							body: 'Bad Gateway',
							parsingError: ['unexpected end of JSON input']
						}
					}
				};
				const errorResponse: MultiGetAccountInfoResult = { Consistent: { Err: error } };

				service.getAccountInfo.mockResolvedValue(errorResponse);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				await expect(getAccountInfo(mockParams)).rejects.toThrow(new SolRpcCanisterError(error));
			});

			it('should throw an error if getAccountInfo returns a generic canister error', async () => {
				// @ts-expect-error we test this in purposes
				const errorResponse: MultiGetAccountInfoResult = { Consistent: genericErrorResponse };
				service.getAccountInfo.mockResolvedValue(errorResponse);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				await expect(getAccountInfo(mockParams)).rejects.toThrow(expectedUnknownRpcError.message);
			});

			it('should throw an error if getAccountInfo returns an unexpected response', async () => {
				const errorResponse: MultiGetAccountInfoResult = {
					// @ts-expect-error we test this in purposes
					Consistent: { Err: { MockError: 'mock-error' } }
				};
				service.getAccountInfo.mockResolvedValue(errorResponse);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				await expect(getAccountInfo(mockParams)).rejects.toThrow(expectedUnknownRpcError.message);
			});

			it('should throw an error if getAccountInfo returns an Inconsistent response', async () => {
				const response: MultiGetAccountInfoResult = {
					Inconsistent: [[mockRpcSource, mockResult]]
				};
				service.getAccountInfo.mockResolvedValue(response);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				await expect(getAccountInfo(mockParams)).rejects.toThrow(expectedInconsistentErrorResponse);
			});

			it('should throw an error if getAccountInfo throws', async () => {
				service.getAccountInfo.mockImplementation(() => {
					throw mockResponseError;
				});

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				await expect(getAccountInfo(mockParams)).rejects.toThrow(mockResponseError);
			});

			it('should throw an error if the network is unknown', async () => {
				service.getAccountInfo.mockResolvedValue(mockResponse);

				const { getAccountInfo } = await createSolRpcCanister({
					serviceOverride: service
				});

				// @ts-expect-error we test this in purposes
				await expect(getAccountInfo({ ...mockParams, network: 'unknown-network' })).rejects.toThrow(
					expectedUnknownNetworkError
				);
			});
		});
	});
});
