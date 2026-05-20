import { collectionMetadata, getTokensByOwner, metadata, transfer } from '$icp/api/icrc7.api';
import { Icrc7Canister } from '$icp/canisters/icrc7.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import {
	mockIcrc7CollectionMetadata,
	mockIcrc7TokenMetadata,
	mockIcrc7TransferOk
} from '$tests/mocks/icrc7-token.mock';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { mock } from 'vitest-mock-extended';

describe('icrc7.api', () => {
	const tokenCanisterMock = mock<Icrc7Canister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(Icrc7Canister, 'create').mockResolvedValue(tokenCanisterMock);
	});

	describe('getTokensByOwner', () => {
		const mockTokens = [123n, 456n, 789n];

		const params = {
			identity: mockIdentity,
			owner: mockPrincipal,
			canisterId: mockIcrc7CanisterId
		};

		const expectedParams = { principal: mockPrincipal };

		beforeEach(() => {
			tokenCanisterMock.getTokensByOwner.mockResolvedValue(mockTokens);
		});

		it('should call the canister getTokensByOwner', async () => {
			const result = await getTokensByOwner(params);

			expect(result).toEqual(mockTokens);
			expect(tokenCanisterMock.getTokensByOwner).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should return an empty array if identity is nullish', async () => {
			await expect(getTokensByOwner({ ...params, identity: undefined })).resolves.toEqual([]);
			await expect(getTokensByOwner({ ...params, identity: null })).resolves.toEqual([]);

			expect(tokenCanisterMock.getTokensByOwner).not.toHaveBeenCalled();
		});

		it('should propagate canister errors', async () => {
			const mockError = new CanisterInternalError('Generic error');
			tokenCanisterMock.getTokensByOwner.mockRejectedValueOnce(mockError);

			await expect(getTokensByOwner(params)).rejects.toThrow(mockError);
		});
	});

	describe('transfer', () => {
		const mockTokenId = 987_456_123n;

		const params = {
			identity: mockIdentity,
			canisterId: mockIcrc7CanisterId,
			to: mockPrincipal2,
			tokenIdentifier: mockTokenId
		};

		const expectedParams = { to: mockPrincipal2, tokenIdentifier: mockTokenId };

		beforeEach(() => {
			tokenCanisterMock.transfer.mockResolvedValue(mockIcrc7TransferOk);
		});

		it('should return the TransferResult from the canister', async () => {
			const result = await transfer(params);

			expect(result).toStrictEqual(mockIcrc7TransferOk);
			expect(tokenCanisterMock.transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should propagate canister errors', async () => {
			const mockError = new CanisterInternalError('Generic error');
			tokenCanisterMock.transfer.mockRejectedValueOnce(mockError);

			await expect(transfer(params)).rejects.toThrow(mockError);
		});
	});

	describe('metadata', () => {
		const mockTokenId = 987_456_123n;

		const params = {
			identity: mockIdentity,
			canisterId: mockIcrc7CanisterId,
			tokenIdentifier: mockTokenId
		};

		const expectedParams = { tokenIdentifier: mockTokenId };

		beforeEach(() => {
			tokenCanisterMock.metadata.mockResolvedValue(mockIcrc7TokenMetadata);
		});

		it('should call the canister metadata', async () => {
			const result = await metadata(params);

			expect(result).toStrictEqual(mockIcrc7TokenMetadata);
			expect(tokenCanisterMock.metadata).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should propagate canister errors', async () => {
			const mockError = new CanisterInternalError('Generic error');
			tokenCanisterMock.metadata.mockRejectedValueOnce(mockError);

			await expect(metadata(params)).rejects.toThrow(mockError);
		});
	});

	describe('collectionMetadata', () => {
		const params = {
			identity: mockIdentity,
			canisterId: mockIcrc7CanisterId
		};

		beforeEach(() => {
			tokenCanisterMock.collectionMetadata.mockResolvedValue(mockIcrc7CollectionMetadata);
		});

		it('should call the canister collectionMetadata', async () => {
			const result = await collectionMetadata(params);

			expect(result).toStrictEqual(mockIcrc7CollectionMetadata);
			expect(tokenCanisterMock.collectionMetadata).toHaveBeenCalledExactlyOnceWith({});
		});

		it('should propagate canister errors', async () => {
			const mockError = new CanisterInternalError('Generic error');
			tokenCanisterMock.collectionMetadata.mockRejectedValueOnce(mockError);

			await expect(collectionMetadata(params)).rejects.toThrow(mockError);
		});
	});

	describe('metadata', () => {
		const mockTokenId = 1n;
		const mockResponse = { name: 'Mock ICRC-7 NFT #1' };

		const params = {
			identity: mockIdentity,
			canisterId: mockIcrc7CanisterId,
			tokenId: mockTokenId
		};

		beforeEach(() => {
			tokenCanisterMock.metadata.mockResolvedValue(mockResponse);
		});

		it('should call metadata successfully', async () => {
			const result = await metadata(params);

			expect(result).toStrictEqual(mockResponse);
			expect(tokenCanisterMock.metadata).toHaveBeenCalledExactlyOnceWith({
				tokenId: mockTokenId
			});
		});

		it('should throw if metadata fails', async () => {
			const mockError = new CanisterInternalError('Generic error');
			tokenCanisterMock.metadata.mockRejectedValueOnce(mockError);

			await expect(metadata(params)).rejects.toThrow(mockError);
		});
	});

	describe('transfer', () => {
		const mockTokenId = 555n;

		const params = {
			identity: mockIdentity,
			canisterId: mockIcrc7CanisterId,
			to: mockIcrc7Account,
			tokenId: mockTokenId
		};

		beforeEach(() => {
			tokenCanisterMock.transfer.mockResolvedValue(7n);
		});

		it('should call transfer with certified=true by default', async () => {
			await transfer(params);

			expect(tokenCanisterMock.transfer).toHaveBeenCalledExactlyOnceWith({
				certified: true,
				to: mockIcrc7Account,
				tokenId: mockTokenId
			});
		});

		it('should throw if the canister transfer fails', async () => {
			const mockError = new CanisterInternalError('Transfer error');
			tokenCanisterMock.transfer.mockRejectedValueOnce(mockError);

			await expect(transfer(params)).rejects.toThrow(mockError);
		});
	});
});
