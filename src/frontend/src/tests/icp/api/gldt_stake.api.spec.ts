import { getApyOverall, manageStakePosition } from '$icp/api/gldt_stake.api';
import { GldtStakeCanister } from '$icp/canisters/gldt_stake.canister';
import * as appContants from '$lib/constants/app.constants';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mock } from 'vitest-mock-extended';

describe('gldt_stake.api', () => {
	const gldtStakeCanisterMock = mock<GldtStakeCanister>();

	beforeEach(() => {
		// eslint-disable-next-line require-await
		vi.spyOn(GldtStakeCanister, 'create').mockImplementation(async () => gldtStakeCanisterMock);

		vi.spyOn(appContants, 'GLDT_STAKE_CANISTER_ID', 'get').mockImplementation(
			() => mockLedgerCanisterId
		);
	});

	describe('getApyOverall', () => {
		const response = 10;

		it('correctly calls the gldt_stake canister getApyOverall method', async () => {
			mockAuthStore();
			gldtStakeCanisterMock.getApyOverall.mockResolvedValue(response);

			const result = await getApyOverall({
				identity: mockIdentity
			});

			expect(gldtStakeCanisterMock.getApyOverall).toHaveBeenCalledOnce();
			expect(result).toBe(response);
		});

		it('throws an error if the gldt_stake canister getApyOverall method called without identity', async () => {
			const res = getApyOverall({
				identity: null
			});

			await expect(res).rejects.toThrow();
		});
	});

	describe('manageStakePosition', () => {
		it('correctly calls the gldt_stake canister manageStakePosition method', async () => {
			mockAuthStore();
			gldtStakeCanisterMock.manageStakePosition.mockResolvedValue(stakePositionMockResponse);

			const result = await manageStakePosition({
				positionParams: { AddStake: { amount: 1n } },
				identity: mockIdentity
			});

			expect(gldtStakeCanisterMock.manageStakePosition).toHaveBeenCalledOnce();
			expect(result).toBe(stakePositionMockResponse);
		});

		it('throws an error if the gldt_stake canister manageStakePosition method called without identity', async () => {
			const res = manageStakePosition({
				positionParams: { AddStake: { amount: 1n } },
				identity: null
			});

			await expect(res).rejects.toThrow();
		});
	});
});
