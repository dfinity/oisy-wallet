import { getTokensByOwner, metadata, transfer } from '$icp/api/icpunks.api';
import { IcPunksCanister } from '$icp/canisters/icpunks.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import { mockIcPunksMetadata } from '$tests/mocks/icpunks-token.mock';
import { mockIcPunksCanisterId } from '$tests/mocks/icpunks-tokens.mock';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
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

	describe('transfer', () => {
		const mockTokenId = 987_456_123n;

		const params = {
			identity: mockIdentity,
			owner: mockPrincipal,
			canisterId: mockIcPunksCanisterId,
			to: mockPrincipal2,
			tokenIdentifier: mockTokenId
		};

		const expectedParams = {
			to: mockPrincipal2,
			tokenIdentifier: mockTokenId
		};

		beforeEach(() => {
			tokenCanisterMock.transfer.mockResolvedValue(true);
		});

		it('should call successfully transfer endpoint', async () => {
			await transfer(params);

			expect(tokenCanisterMock.transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should throw an error if transfer fails', async () => {
			const mockError = new CanisterInternalError('Generic error');

			tokenCanisterMock.transfer.mockRejectedValueOnce(mockError);

			await expect(transfer(params)).rejects.toThrowError(mockError);

			expect(tokenCanisterMock.transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});
	});

	describe('metadata', () => {
		const mockTokenId = 987_456_123n;

		const params = {
			identity: mockIdentity,
			owner: mockPrincipal,
			canisterId: mockIcPunksCanisterId,
			tokenIdentifier: mockTokenId
		};

		const expectedParams = {
			tokenIdentifier: mockTokenId
		};

		beforeEach(() => {
			tokenCanisterMock.metadata.mockResolvedValue(mockIcPunksMetadata);
		});

		it('should call successfully metadata endpoint', async () => {
			const result = await metadata(params);

			expect(result).toStrictEqual(mockIcPunksMetadata);

			expect(tokenCanisterMock.metadata).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should throw an error if metadata fails', async () => {
			const mockError = new CanisterInternalError('Generic error');

			tokenCanisterMock.metadata.mockRejectedValueOnce(mockError);

			await expect(metadata(params)).rejects.toThrowError(mockError);

			expect(tokenCanisterMock.metadata).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});
	});
});
