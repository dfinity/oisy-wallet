import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { sendNft } from '$icp/services/nft-send.services';
import { transferDip721, transferExtV2 } from '$icp/services/nft-transfer.services';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { mockValidDip721Nft, mockValidExtNft } from '$tests/mocks/nfts.mock';

vi.mock('$icp/services/nft-transfer.services', () => ({
	transferExtV2: vi.fn(),
	transferDip721: vi.fn()
}));

describe('nft-send.services', () => {
	describe('sendNft', () => {
		const mockProgress = vi.fn();

		const mockParams = {
			token: mockValidExtV2Token,
			tokenId: mockValidExtNft.id,
			identity: mockIdentity,
			progress: mockProgress,
			to: mockPrincipal2.toText()
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return early if identity is nullish', async () => {
			await sendNft({ ...mockParams, identity: undefined });

			await sendNft({ ...mockParams, identity: null });

			expect(transferExtV2).not.toHaveBeenCalled();
		});

		it('should return early if network is not ICP', async () => {
			await sendNft({
				...mockParams,
				token: { ...mockValidExtV2Token, network: ETHEREUM_NETWORK }
			});

			expect(transferExtV2).not.toHaveBeenCalled();
		});

		it('should return early if token is not supported standard', async () => {
			await sendNft({
				...mockParams,
				token: { ...mockValidExtV2Token, standard: { code: 'icrc' } }
			});

			expect(transferExtV2).not.toHaveBeenCalled();
		});

		it('should call the EXT transfer service', async () => {
			const expectedParams = {
				identity: mockIdentity,
				canisterId: mockValidExtV2Token.canisterId,
				from: mockPrincipal,
				to: mockPrincipal2,
				tokenIdentifier: mockValidExtNft.id,
				amount: 1n, // currently fixed at 1
				progress: mockProgress
			};

			await sendNft(mockParams);

			expect(transferExtV2).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should call the DIP721 transfer service', async () => {
			const expectedParams = {
				identity: mockIdentity,
				canisterId: mockValidDip721Token.canisterId,
				to: mockPrincipal2,
				tokenIdentifier: BigInt(mockValidDip721Nft.id),
				progress: mockProgress
			};

			await sendNft({ ...mockParams, token: mockValidDip721Token, tokenId: mockValidDip721Nft.id });

			expect(transferDip721).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});
	});
});
