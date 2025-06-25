import { getAccountInfo } from '$sol/api/sol-rpc.api';
import { SolRpcCanister } from '$sol/canisters/sol-rpc.canister';
import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockAccountInfo, mockParsedAccountInfo } from '$tests/mocks/sol-rpc.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { mock } from 'vitest-mock-extended';

describe('icp-ledger.api', () => {
	const solRpcCanisterMock = mock<SolRpcCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(SolRpcCanister, 'create').mockResolvedValue(solRpcCanisterMock);
	});

	describe('getAccountInfo', () => {
		const address = mockSolAddress;

		const params = {
			address,
			network: 'mainnet' as const,
			identity: mockIdentity
		};

		const expectedParsedAccountInfo = {
			...mockAccountInfo,
			data: {
				...mockAccountInfo.data,
				json: {
					space: 1n,
					parsed: mockParsedAccountInfo,
					program: SYSTEM_PROGRAM_ADDRESS
				}
			}
		};

		beforeEach(() => {
			solRpcCanisterMock.getAccountInfo.mockResolvedValue(mockAccountInfo);
		});

		it('should successfully call getAccountInfo endpoint', async () => {
			const result = await getAccountInfo(params);

			expect(result).toEqual(expectedParsedAccountInfo);

			expect(solRpcCanisterMock.getAccountInfo).toHaveBeenCalledExactlyOnceWith({
				address,
				network: 'mainnet'
			});
		});

		it('should returned unparsed account info', async () => {
			solRpcCanisterMock.getAccountInfo.mockResolvedValue({
				...mockAccountInfo,
				data: { legacyBinary: 'binary-string' }
			});

			const result = await getAccountInfo(params);

			expect(result).toEqual({
				...mockAccountInfo,
				data: { legacyBinary: 'binary-string' }
			});
		});

		it('should handle undefined account info', async () => {
			solRpcCanisterMock.getAccountInfo.mockResolvedValue(undefined);

			const result = await getAccountInfo(params);

			expect(result).toBeUndefined();
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(getAccountInfo({ ...params, identity: undefined })).rejects.toThrow();
		});
	});
});
