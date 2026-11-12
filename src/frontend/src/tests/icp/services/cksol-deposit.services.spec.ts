import { getDepositAddress } from '$icp/api/cksol-minter.api';
import {
	loadCkSolDepositAddress,
	resetCkSolDepositAddresses
} from '$icp/services/cksol-deposit.services';
import { mockIdentity, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import type { Identity } from '@icp-sdk/core/agent';

vi.mock('$icp/api/cksol-minter.api', () => ({
	getDepositAddress: vi.fn()
}));

describe('cksol-deposit.services', () => {
	const minterCanisterId = 'lh22c-kyaaa-aaaar-qb5nq-cai';

	beforeEach(() => {
		vi.clearAllMocks();

		resetCkSolDepositAddresses();

		vi.mocked(getDepositAddress).mockResolvedValue(mockSolAddress);
	});

	describe('loadCkSolDepositAddress', () => {
		it('should ask the minter for the deposit address of the identity', async () => {
			await expect(
				loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId })
			).resolves.toBe(mockSolAddress);
			expect(getDepositAddress).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				minterCanisterId
			});
		});

		it('should ask the minter only once per account', async () => {
			await loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId });
			await loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId });

			expect(getDepositAddress).toHaveBeenCalledOnce();
		});

		it('should ask the minter again for another identity', async () => {
			const otherIdentity = { getPrincipal: () => mockPrincipal2 } as unknown as Identity;

			vi.mocked(getDepositAddress).mockResolvedValueOnce(mockSolAddress);
			vi.mocked(getDepositAddress).mockResolvedValueOnce(mockSolAddress2);

			await expect(
				loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId })
			).resolves.toBe(mockSolAddress);
			await expect(
				loadCkSolDepositAddress({ identity: otherIdentity, minterCanisterId })
			).resolves.toBe(mockSolAddress2);
			expect(getDepositAddress).toHaveBeenCalledTimes(2);
		});

		it('should ask the minter again after a failed call', async () => {
			vi.mocked(getDepositAddress).mockRejectedValueOnce(new Error('unreachable'));

			await expect(
				loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId })
			).rejects.toThrow('unreachable');
			await expect(
				loadCkSolDepositAddress({ identity: mockIdentity, minterCanisterId })
			).resolves.toBe(mockSolAddress);
			expect(getDepositAddress).toHaveBeenCalledTimes(2);
		});
	});
});
