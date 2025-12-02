import { transfer } from '$icp/api/ext-v2-token.api';
import { transferExtV2 } from '$icp/services/nft-transfer.services';
import { ProgressStepsSend as ProgressStepsSendEnum } from '$lib/enums/progress-steps';
import { bn3Bi } from '$tests/mocks/balances.mock';
import { mockExtV2TokenCanisterId, mockExtV2TokenIdentifier } from '$tests/mocks/ext-v2-token.mock';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';

vi.mock('$icp/api/ext-v2-token.api', () => ({
	transfer: vi.fn()
}));

describe('nft-transfer.services', () => {
	describe('transferExtV2', () => {
		const mockProgress = vi.fn();

		const mockParams = {
			identity: mockIdentity,
			canisterId: mockExtV2TokenCanisterId,
			from: mockPrincipal,
			to: mockPrincipal2,
			tokenIdentifier: mockExtV2TokenIdentifier,
			amount: bn3Bi,
			progress: mockProgress
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call the transfer endpoint of EXT token canister', async () => {
			await transferExtV2(mockParams);

			const { progress: _, ...expected } = mockParams;

			expect(transfer).toHaveBeenCalledExactlyOnceWith(expected);
		});

		it('should call the progress callback with the transfer progress', async () => {
			await transferExtV2(mockParams);

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendEnum.SIGN_TRANSFER);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSendEnum.TRANSFER);
		});
	});
});
