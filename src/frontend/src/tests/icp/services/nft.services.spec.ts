import * as extTokenApi from '$icp/api/ext-v2-token.api';
import { getTokensByOwner as getExtTokensByOwner } from '$icp/api/ext-v2-token.api';
import { loadNfts } from '$icp/services/nft.services';
import { mapExtNft } from '$icp/utils/nft.utils';
import { mockValidExtV2Token, mockValidExtV2Token2 } from '$tests/mocks/ext-tokens.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
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

			expect(getExtTokensByOwner).not.toHaveBeenCalled();
		});

		it('should return an empty array if the tokens list is empty', async () => {
			await expect(loadNfts({ ...mockParams, tokens: [] })).resolves.toEqual([]);

			expect(getExtTokensByOwner).not.toHaveBeenCalled();
		});

		it('should return an empty array if there are not tokens owned by the user', async () => {
			vi.spyOn(extTokenApi, 'getTokensByOwner').mockResolvedValue([]);

			await expect(loadNfts(mockParams)).resolves.toEqual([]);

			expect(getExtTokensByOwner).toHaveBeenCalledTimes(mockParams.tokens.length);

			mockParams.tokens.forEach(({ canisterId }) => {
				expect(getExtTokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});
		});

		it('should return the list of NFTs owned by the user', async () => {
			await expect(loadNfts(mockParams)).resolves.toEqual(expected);

			expect(getExtTokensByOwner).toHaveBeenCalledTimes(mockParams.tokens.length);

			mockParams.tokens.forEach(({ canisterId }) => {
				expect(getExtTokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});
		});

		it('should handle EXT service errors gracefully', async () => {
			const mockError = new Error('Mock error');
			vi.spyOn(extTokenApi, 'getTokensByOwner').mockRejectedValueOnce(mockError);

			await expect(loadNfts(mockParams)).resolves.toEqual(expected2);

			expect(getExtTokensByOwner).toHaveBeenCalledTimes(mockParams.tokens.length);

			mockParams.tokens.forEach(({ canisterId }) => {
				expect(getExtTokensByOwner).toHaveBeenCalledWith({
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

		it("should raise an error if the token's standard is not supported", async () => {
			// @ts-expect-error we test this on purpose
			await expect(loadNfts({ ...mockParams, tokens: [mockValidIcrcToken] })).rejects.toThrowError(
				`Unsupported NFT IC token ${mockValidIcrcToken.standard}`
			);

			expect(getExtTokensByOwner).not.toHaveBeenCalled();
		});
	});
});
