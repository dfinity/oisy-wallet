import { getTokensByOwner } from '$icp/api/icpunks.api';
import { IcPunksCanister } from '$icp/canisters/icpunks.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import { mockIcPunksCanisterId } from '$tests/mocks/icpunks-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { mock } from 'vitest-mock-extended';

describe('icpunks.api', () => {
	const tokenCanisterMock = mock<IcPunksCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(IcPunksCanister, 'create').mockResolvedValue(tokenCanisterMock);
	});

	describe('getTokensByOwner', () => {
		const mockTokens = [123n, 456n, 789n];

		const params = {
			identity: mockIdentity,
			owner: mockPrincipal,
			canisterId: mockIcPunksCanisterId
		};

		const expectedParams = {
			principal: mockPrincipal
		};

		beforeEach(() => {
			tokenCanisterMock.getTokensByOwner.mockResolvedValue(mockTokens);
		});

		it('should call successfully getTokensByOwner endpoint', async () => {
			const result = await getTokensByOwner(params);

			expect(result).toEqual(mockTokens);

			expect(tokenCanisterMock.getTokensByOwner).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should return an empty array if identity is nullish', async () => {
			await expect(getTokensByOwner({ ...params, identity: undefined })).resolves.toEqual([]);

			await expect(getTokensByOwner({ ...params, identity: null })).resolves.toEqual([]);

			expect(tokenCanisterMock.getTokensByOwner).not.toHaveBeenCalled();
		});

		it('should throw an error if getTokensByOwner fails', async () => {
			const mockError = new CanisterInternalError('Generic error');

			tokenCanisterMock.getTokensByOwner.mockRejectedValueOnce(mockError);

			await expect(getTokensByOwner(params)).rejects.toThrowError(mockError);

			expect(tokenCanisterMock.getTokensByOwner).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});
	});
});
