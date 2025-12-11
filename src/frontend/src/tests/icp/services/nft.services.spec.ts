import * as extTokenApi from '$icp/api/ext-v2-token.api';
import { getTokensByOwner } from '$icp/api/ext-v2-token.api';
import { loadNfts } from '$icp/services/nft.services';
import { mapExtNft } from '$icp/utils/nft.utils';
import { mockValidExtV2Token, mockValidExtV2Token2 } from '$tests/mocks/ext-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';

describe('nft.services', () => {
	describe('loadNfts', async () => {
		const mockParams = {
			tokens: [mockValidExtV2Token, mockValidExtV2Token2],
			identity: mockIdentity
		};

		const mockTokenIndices1 = [1, 2, 3];
		const mockTokenIndices2 = [4, 5];

		const expected1 = await Promise.all(
			mockTokenIndices1.map((index) =>
				mapExtNft({ index, token: mockValidExtV2Token, identity: mockIdentity })
			)
		);
		const expected2 = await Promise.all(
			mockTokenIndices2.map((index) =>
				mapExtNft({ index, token: mockValidExtV2Token2, identity: mockIdentity })
			)
		);
		const expected = [...expected1, ...expected2];

		beforeEach(() => {
			vi.clearAllMocks();

			// @ts-expect-error This is a mocked implementation that is not asynchronous as the original method is.
			vi.spyOn(extTokenApi, 'getTokensByOwner').mockImplementation(({ canisterId }) => {
				if (canisterId === mockValidExtV2Token.canisterId) {
					return mockTokenIndices1;
				}

				if (canisterId === mockValidExtV2Token2.canisterId) {
					return mockTokenIndices2;
				}

				return [];
			});
		});

		it('should return an empty array if the identity is nullish', async () => {
			await expect(loadNfts({ ...mockParams, identity: null })).resolves.toEqual([]);

			await expect(loadNfts({ ...mockParams, identity: undefined })).resolves.toEqual([]);

			expect(getTokensByOwner).not.toHaveBeenCalled();
		});

		it('should return an empty array if the tokens list is empty', async () => {
			await expect(loadNfts({ ...mockParams, tokens: [] })).resolves.toEqual([]);

			expect(getTokensByOwner).not.toHaveBeenCalled();
		});

		it('should return an empty array if there are not tokens owned by the user', async () => {
			vi.spyOn(extTokenApi, 'getTokensByOwner').mockResolvedValue([]);

			await expect(loadNfts(mockParams)).resolves.toEqual([]);

			expect(getTokensByOwner).toHaveBeenCalledTimes(mockParams.tokens.length);

			mockParams.tokens.forEach(({ canisterId }) => {
				expect(getTokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});
		});

		it('should return the list of NFTs owned by the user', async () => {
			await expect(loadNfts(mockParams)).resolves.toEqual(expected);

			expect(getTokensByOwner).toHaveBeenCalledTimes(mockParams.tokens.length);

			mockParams.tokens.forEach(({ canisterId }) => {
				expect(getTokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});
		});

		it('should handle errors gracefully', async () => {
			const mockError = new Error('Mock error');
			vi.spyOn(extTokenApi, 'getTokensByOwner').mockRejectedValueOnce(mockError);

			await expect(loadNfts(mockParams)).resolves.toEqual(expected2);

			expect(getTokensByOwner).toHaveBeenCalledTimes(mockParams.tokens.length);

			mockParams.tokens.forEach(({ canisterId }) => {
				expect(getTokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});

			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				`Error loading EXT tokens from collection ${mockValidExtV2Token.canisterId}:`,
				mockError
			);
		});
	});
});
