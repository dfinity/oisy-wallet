import * as dip721Api from '$icp/api/dip721.api';
import { getTokensByOwner as getDip721TokensByOwner } from '$icp/api/dip721.api';
import * as extTokenApi from '$icp/api/ext-v2-token.api';
import { getTokensByOwner as getExtTokensByOwner } from '$icp/api/ext-v2-token.api';
import { loadNfts } from '$icp/services/nft.services';
import { mapDip721Nft, mapExtNft } from '$icp/utils/nft.utils';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
import { mockValidExtV2Token, mockValidExtV2Token2 } from '$tests/mocks/ext-tokens.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';

describe('nft.services', () => {
	describe('loadNfts', async () => {
		const mockExtTokens = [mockValidExtV2Token, mockValidExtV2Token2];
		const mockDip721Tokens = [mockValidDip721Token];

		const mockParams = {
			tokens: [...mockExtTokens, ...mockDip721Tokens],
			identity: mockIdentity
		};

		const mockTokenIndices1 = [1, 2, 3];
		const mockTokenIndices2 = [4, 5];
		const mockTokenIndices3 = [6n, 7n, 8n];

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
		const expected3 = await Promise.all(
			mockTokenIndices3.map((index) => mapDip721Nft({ index, token: mockValidDip721Token }))
		);
		const expected = [...expected1, ...expected2, ...expected3];

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

			// @ts-expect-error This is a mocked implementation that is not asynchronous as the original method is.
			vi.spyOn(dip721Api, 'getTokensByOwner').mockImplementation(({ canisterId }) => {
				if (canisterId === mockValidDip721Token.canisterId) {
					return mockTokenIndices3;
				}

				return [];
			});
		});

		it('should return an empty array if the identity is nullish', async () => {
			await expect(loadNfts({ ...mockParams, identity: null })).resolves.toEqual([]);

			await expect(loadNfts({ ...mockParams, identity: undefined })).resolves.toEqual([]);

			expect(getExtTokensByOwner).not.toHaveBeenCalled();
			expect(getDip721TokensByOwner).not.toHaveBeenCalled();
		});

		it('should return an empty array if the tokens list is empty', async () => {
			await expect(loadNfts({ ...mockParams, tokens: [] })).resolves.toEqual([]);

			expect(getExtTokensByOwner).not.toHaveBeenCalled();
			expect(getDip721TokensByOwner).not.toHaveBeenCalled();
		});

		it('should return an empty array if there are not tokens owned by the user', async () => {
			vi.spyOn(extTokenApi, 'getTokensByOwner').mockResolvedValue([]);
			vi.spyOn(dip721Api, 'getTokensByOwner').mockResolvedValue([]);

			await expect(loadNfts(mockParams)).resolves.toEqual([]);

			expect(getExtTokensByOwner).toHaveBeenCalledTimes(mockExtTokens.length);

			mockExtTokens.forEach(({ canisterId }) => {
				expect(getExtTokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});

			expect(getDip721TokensByOwner).toHaveBeenCalledTimes(mockDip721Tokens.length);

			mockDip721Tokens.forEach(({ canisterId }) => {
				expect(getDip721TokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});
		});

		it('should return the list of NFTs owned by the user', async () => {
			await expect(loadNfts(mockParams)).resolves.toEqual(expected);

			expect(getExtTokensByOwner).toHaveBeenCalledTimes(mockExtTokens.length);

			mockExtTokens.forEach(({ canisterId }) => {
				expect(getExtTokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});

			expect(getDip721TokensByOwner).toHaveBeenCalledTimes(mockDip721Tokens.length);

			mockDip721Tokens.forEach(({ canisterId }) => {
				expect(getDip721TokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});
		});

		it('should handle EXT service errors gracefully', async () => {
			const mockError = new Error('Mock EXT error');
			vi.spyOn(extTokenApi, 'getTokensByOwner').mockRejectedValueOnce(mockError);

			await expect(loadNfts(mockParams)).resolves.toEqual([...expected2, ...expected3]);

			expect(getExtTokensByOwner).toHaveBeenCalledTimes(mockExtTokens.length);

			mockExtTokens.forEach(({ canisterId }) => {
				expect(getExtTokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});

			expect(getDip721TokensByOwner).toHaveBeenCalledTimes(mockDip721Tokens.length);

			mockDip721Tokens.forEach(({ canisterId }) => {
				expect(getDip721TokensByOwner).toHaveBeenCalledWith({
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

		it('should handle DIP721 service errors gracefully', async () => {
			const mockError = new Error('Mock DIP721 error');
			vi.spyOn(dip721Api, 'getTokensByOwner').mockRejectedValueOnce(mockError);

			await expect(loadNfts(mockParams)).resolves.toEqual([...expected1, ...expected2]);

			expect(getExtTokensByOwner).toHaveBeenCalledTimes(mockExtTokens.length);

			mockExtTokens.forEach(({ canisterId }) => {
				expect(getExtTokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});

			expect(getDip721TokensByOwner).toHaveBeenCalledTimes(mockDip721Tokens.length);

			mockDip721Tokens.forEach(({ canisterId }) => {
				expect(getDip721TokensByOwner).toHaveBeenCalledWith({
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId
				});
			});

			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				`Error loading DIP721 tokens from collection ${mockValidDip721Token.canisterId}:`,
				mockError
			);
		});

		it("should raise an error if the token's standard is not supported", async () => {
			// @ts-expect-error we test this on purpose
			await expect(loadNfts({ ...mockParams, tokens: [mockValidIcrcToken] })).rejects.toThrowError(
				`Unsupported NFT IC token ${mockValidIcrcToken.standard.code}`
			);

			expect(getExtTokensByOwner).not.toHaveBeenCalled();
		});
	});
});
