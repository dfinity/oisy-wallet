import {
	collectionMetadata,
	getOwnersOf,
	getTokensByOwner,
	metadata,
	tokenMetadata,
	transfer
} from '$icp/api/icrc7.api';
import { Icrc7Canister } from '$icp/canisters/icrc7.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import {
	mockIcrc7Account,
	mockIcrc7CollectionMetadata,
	mockIcrc7TokenMetadata
} from '$tests/mocks/icrc7-token.mock';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mock } from 'vitest-mock-extended';

describe('icrc7.api', () => {
	const tokenCanisterMock = mock<Icrc7Canister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(Icrc7Canister, 'create').mockResolvedValue(tokenCanisterMock);
	});

	describe('collectionMetadata', () => {
		const params = {
			identity: mockIdentity,
			canisterId: mockIcrc7CanisterId
		};

		beforeEach(() => {
			tokenCanisterMock.collectionMetadata.mockResolvedValue(mockIcrc7CollectionMetadata);
		});

		it('should call collectionMetadata successfully', async () => {
			const result = await collectionMetadata(params);

			expect(result).toStrictEqual(mockIcrc7CollectionMetadata);
			expect(tokenCanisterMock.collectionMetadata).toHaveBeenCalledExactlyOnceWith({});
		});

		it('should throw if collectionMetadata fails', async () => {
			const mockError = new CanisterInternalError('Generic error');
			tokenCanisterMock.collectionMetadata.mockRejectedValueOnce(mockError);

			await expect(collectionMetadata(params)).rejects.toThrow(mockError);
		});
	});

	describe('getTokensByOwner', () => {
		const mockTokenIds = [123n, 456n];

		const params = {
			identity: mockIdentity,
			canisterId: mockIcrc7CanisterId,
			owner: mockIcrc7Account
		};

		beforeEach(() => {
			tokenCanisterMock.getTokensByOwner.mockResolvedValue(mockTokenIds);
		});

		it('should call getTokensByOwner successfully', async () => {
			const result = await getTokensByOwner(params);

			expect(result).toEqual(mockTokenIds);
			expect(tokenCanisterMock.getTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				owner: mockIcrc7Account,
				prev: undefined,
				take: undefined
			});
		});

		it('should pass prev / take to the canister', async () => {
			await getTokensByOwner({ ...params, prev: 1n, take: 10n });

			expect(tokenCanisterMock.getTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				owner: mockIcrc7Account,
				prev: 1n,
				take: 10n
			});
		});

		it('should return [] if identity is nullish', async () => {
			await expect(getTokensByOwner({ ...params, identity: undefined })).resolves.toEqual([]);
			await expect(getTokensByOwner({ ...params, identity: null })).resolves.toEqual([]);

			expect(tokenCanisterMock.getTokensByOwner).not.toHaveBeenCalled();
		});

		it('should throw if getTokensByOwner fails', async () => {
			const mockError = new CanisterInternalError('Generic error');
			tokenCanisterMock.getTokensByOwner.mockRejectedValueOnce(mockError);

			await expect(getTokensByOwner(params)).rejects.toThrow(mockError);
		});
	});

	describe('getOwnersOf', () => {
		const mockTokenIds = [1n, 2n];
		const mockOwners: Array<[] | [typeof mockIcrc7Account]> = [[mockIcrc7Account], []];

		const params = {
			identity: mockIdentity,
			canisterId: mockIcrc7CanisterId,
			tokenIds: mockTokenIds
		};

		beforeEach(() => {
			tokenCanisterMock.getOwnersOf.mockResolvedValue(mockOwners);
		});

		it('should call getOwnersOf successfully', async () => {
			const result = await getOwnersOf(params);

			expect(result).toStrictEqual(mockOwners);
			expect(tokenCanisterMock.getOwnersOf).toHaveBeenCalledExactlyOnceWith({
				tokenIds: mockTokenIds
			});
		});

		it('should throw if getOwnersOf fails', async () => {
			const mockError = new CanisterInternalError('Generic error');
			tokenCanisterMock.getOwnersOf.mockRejectedValueOnce(mockError);

			await expect(getOwnersOf(params)).rejects.toThrow(mockError);
		});
	});

	describe('tokenMetadata', () => {
		const mockTokenIds = [1n];
		const mockResponse: Array<[] | [typeof mockIcrc7TokenMetadata]> = [[mockIcrc7TokenMetadata]];

		const params = {
			identity: mockIdentity,
			canisterId: mockIcrc7CanisterId,
			tokenIds: mockTokenIds
		};

		beforeEach(() => {
			tokenCanisterMock.tokenMetadata.mockResolvedValue(mockResponse);
		});

		it('should call tokenMetadata successfully', async () => {
			const result = await tokenMetadata(params);

			expect(result).toStrictEqual(mockResponse);
			expect(tokenCanisterMock.tokenMetadata).toHaveBeenCalledExactlyOnceWith({
				tokenIds: mockTokenIds
			});
		});

		it('should throw if tokenMetadata fails', async () => {
			const mockError = new CanisterInternalError('Generic error');
			tokenCanisterMock.tokenMetadata.mockRejectedValueOnce(mockError);

			await expect(tokenMetadata(params)).rejects.toThrow(mockError);
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
