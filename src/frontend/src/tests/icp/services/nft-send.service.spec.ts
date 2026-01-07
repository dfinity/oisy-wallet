import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { sendNft } from '$icp/services/nft-send.services';
import { transferExtV2 } from '$icp/services/nft-transfer.services';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { mockValidExtNft } from '$tests/mocks/nfts.mock';

vi.mock('$icp/services/nft-transfer.services', () => ({
	transferExtV2: vi.fn()
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

		const expectedParams = {
			identity: mockIdentity,
			canisterId: mockValidExtV2Token.canisterId,
			from: mockPrincipal,
			to: mockPrincipal2,
			tokenIdentifier: mockValidExtNft.id,
			amount: 1n, // currently fixed at 1
			progress: mockProgress
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

		it('should return early if token is not EXT v2 standard', async () => {
			await sendNft({
				...mockParams,
				token: { ...mockValidExtV2Token, standard: { code: 'icrc' } }
			});

			expect(transferExtV2).not.toHaveBeenCalled();
		});

		it('should call the EXT transfer service', async () => {
			await sendNft(mockParams);

			expect(transferExtV2).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});
	});
});
