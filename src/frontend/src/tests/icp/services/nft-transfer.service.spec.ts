import { transfer as transferDip721Api } from '$icp/api/dip721.api';
import { transfer as transferExtApi } from '$icp/api/ext-v2-token.api';
import { transfer as transferIcPunksApi } from '$icp/api/icpunks.api';
import { transfer as transferIcrc7Api } from '$icp/api/icrc7.api';
import {
	transferDip721,
	transferExtV2,
	transferIcPunks,
	transferIcrc7
} from '$icp/services/nft-transfer.services';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import { bn3Bi } from '$tests/mocks/balances.mock';
import { mockDip721TokenCanisterId } from '$tests/mocks/dip721-tokens.mock';
import { mockExtV2TokenCanisterId, mockExtV2TokenIdentifier } from '$tests/mocks/ext-v2-token.mock';
import { mockIcPunksCanisterId } from '$tests/mocks/icpunks-tokens.mock';
import {
	mockIcrc7TransferErrUnauthorized,
	mockIcrc7TransferOk
} from '$tests/mocks/icrc7-token.mock';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';

vi.mock('$icp/api/ext-v2-token.api', () => ({
	transfer: vi.fn()
}));

vi.mock('$icp/api/dip721.api', () => ({
	transfer: vi.fn()
}));

vi.mock('$icp/api/icpunks.api', () => ({
	transfer: vi.fn()
}));

vi.mock('$icp/api/icrc7.api', () => ({
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

			expect(transferExtApi).toHaveBeenCalledExactlyOnceWith(expected);
		});

		it('should call the progress callback with the transfer progress', async () => {
			await transferExtV2(mockParams);

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSendIc.RELOAD);
		});
	});

	describe('transferDip721', () => {
		const mockProgress = vi.fn();

		const mockParams = {
			identity: mockIdentity,
			canisterId: mockDip721TokenCanisterId,
			to: mockPrincipal2,
			tokenIdentifier: 123n,
			progress: mockProgress
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call the transfer endpoint of DIP721 canister', async () => {
			await transferDip721(mockParams);

			const { progress: _, ...expected } = mockParams;

			expect(transferDip721Api).toHaveBeenCalledExactlyOnceWith(expected);
		});

		it('should call the progress callback with the transfer progress', async () => {
			await transferDip721(mockParams);

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSendIc.RELOAD);
		});
	});

	describe('transferIcPunks', () => {
		const mockProgress = vi.fn();

		const mockParams = {
			identity: mockIdentity,
			canisterId: mockIcPunksCanisterId,
			to: mockPrincipal2,
			tokenIdentifier: 123n,
			progress: mockProgress
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call the transfer endpoint of ICPunks canister', async () => {
			await transferIcPunks(mockParams);

			const { progress: _, ...expected } = mockParams;

			expect(transferIcPunksApi).toHaveBeenCalledExactlyOnceWith(expected);
		});

		it('should call the progress callback with the transfer progress', async () => {
			await transferIcPunks(mockParams);

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSendIc.RELOAD);
		});
	});

	describe('transferIcrc7', () => {
		const mockProgress = vi.fn();

		const mockParams = {
			identity: mockIdentity,
			canisterId: mockIcrc7CanisterId,
			to: mockPrincipal2,
			tokenIdentifier: 123n,
			progress: mockProgress
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(transferIcrc7Api).mockResolvedValue(mockIcrc7TransferOk);
		});

		it('should call the transfer endpoint of the ICRC-7 canister with certified=true', async () => {
			await transferIcrc7(mockParams);

			const { progress: _, ...expected } = mockParams;

			expect(transferIcrc7Api).toHaveBeenCalledExactlyOnceWith({
				...expected,
				certified: true
			});
		});

		it('should drive the progress callback through SEND and RELOAD', async () => {
			await transferIcrc7(mockParams);

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSendIc.RELOAD);
		});

		it('should throw when the canister returns a TransferError', async () => {
			vi.mocked(transferIcrc7Api).mockResolvedValue(mockIcrc7TransferErrUnauthorized);

			await expect(transferIcrc7(mockParams)).rejects.toThrow(/ICRC-7 transfer failed/);

			expect(mockProgress).toHaveBeenCalledExactlyOnceWith(ProgressStepsSendIc.SEND);
		});
	});
});
