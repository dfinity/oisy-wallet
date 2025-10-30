import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import * as gldtStakeApi from '$icp/api/gldt_stake.api';
import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import { stakeGldt, unstakeGldt } from '$icp/services/gldt-stake.services';
import * as dateUtils from '$icp/utils/date.utils';
import * as appConstants from '$lib/constants/app.constants';
import { NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { ProgressStepsStake, ProgressStepsUnstake } from '$lib/enums/progress-steps';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import { mockLedgerCanisterId, mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';

describe('gldt-stake.services', () => {
	const mockProgress = vi.fn();
	const mockStakeCompleted = vi.fn();
	const gldtToken = {
		...mockValidIcrcToken,
		symbol: 'GLDT',
		ledgerCanisterId: GLDT_LEDGER_CANISTER_ID
	};
	const mockAmount = 10_000n;
	const baseParams = {
		identity: mockIdentity,
		amount: mockAmount,
		progress: mockProgress,
		gldtToken
	};

	beforeEach(() => {
		vi.resetAllMocks();

		vi.spyOn(appConstants, 'GLDT_STAKE_CANISTER_ID', 'get').mockImplementation(
			() => mockLedgerCanisterId
		);
		vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
		vi.spyOn(dateUtils, 'nowInBigIntNanoSeconds').mockResolvedValue(987_654_321n);
		vi.spyOn(gldtStakeApi, 'manageStakePosition').mockResolvedValue(stakePositionMockResponse);
	});

	describe('stakeGldt', () => {
		it('calls all required functions and returns response correctly', async () => {
			const response = await stakeGldt({ ...baseParams, stakeCompleted: mockStakeCompleted });

			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsStake.APPROVE);
			expect(icrcLedgerApi.approve).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: gldtToken.ledgerCanisterId,
				amount: mockAmount + gldtToken.fee * 2n,
				expiresAt: dateUtils.nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
				spender: {
					owner: Principal.from(mockLedgerCanisterId)
				}
			});
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsStake.STAKE);
			expect(gldtStakeApi.manageStakePosition).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				positionParams: { AddStake: { amount: mockAmount + gldtToken.fee } }
			});
			expect(response).toBe(stakePositionMockResponse);
			expect(mockProgress).toHaveBeenNthCalledWith(3, ProgressStepsStake.UPDATE_UI);
			expect(mockStakeCompleted).toHaveBeenCalledOnce();
		});
	});

	describe('unstakeGldt', () => {
		const unstakeParams = {
			...baseParams,
			unstakeCompleted: mockStakeCompleted,
			totalStakedAmount: 100000n,
			dissolveInstantly: false
		};

		it('calls all required functions and returns response correctly when dissolving with delay', async () => {
			const response = await unstakeGldt(unstakeParams);

			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsUnstake.UNSTAKE);
			expect(gldtStakeApi.manageStakePosition).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				positionParams: { StartDissolving: { fraction: 10 } }
			});
			expect(response).toBe(stakePositionMockResponse);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsUnstake.UPDATE_UI);
			expect(mockStakeCompleted).toHaveBeenCalledOnce();
		});

		it('calls all required functions and returns response correctly when dissolving immediately', async () => {
			const response = await unstakeGldt({ ...unstakeParams, dissolveInstantly: true });

			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsUnstake.UNSTAKE);
			expect(gldtStakeApi.manageStakePosition).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				positionParams: { DissolveInstantly: { fraction: 10 } }
			});
			expect(response).toBe(stakePositionMockResponse);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsUnstake.UPDATE_UI);
			expect(mockStakeCompleted).toHaveBeenCalledOnce();
		});
	});
});
