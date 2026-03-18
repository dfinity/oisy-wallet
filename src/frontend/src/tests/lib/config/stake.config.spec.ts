import {
	claimStakingRewardWizardSteps,
	stakeWizardSteps,
	unstakeWizardSteps
} from '$lib/config/stake.config';
import {
	WizardStepsClaimStakingReward,
	WizardStepsStake,
	WizardStepsUnstake
} from '$lib/enums/wizard-steps';
import en from '$tests/mocks/i18n.mock';

describe('stake.config', () => {
	describe('stakeWizardSteps', () => {
		const mockParams = {
			i18n: en
		};

		it('should return the correct steps with expected text and state', () => {
			const steps = stakeWizardSteps(mockParams);

			expect(steps).toStrictEqual([
				{
					name: WizardStepsStake.STAKE,
					title: en.stake.text.stake
				},
				{
					name: WizardStepsStake.REVIEW,
					title: en.stake.text.review
				},
				{
					name: WizardStepsStake.STAKING,
					title: en.stake.text.executing_transaction
				}
			]);
		});
	});

	describe('unstakeWizardSteps', () => {
		const mockParams = {
			i18n: en
		};

		it('should return the correct steps with expected text and state', () => {
			const steps = unstakeWizardSteps(mockParams);

			expect(steps).toStrictEqual([
				{
					name: WizardStepsUnstake.UNSTAKE,
					title: en.stake.text.unstake
				},
				{
					name: WizardStepsUnstake.REVIEW,
					title: en.stake.text.review
				},
				{
					name: WizardStepsUnstake.UNSTAKING,
					title: en.stake.text.executing_transaction
				}
			]);
		});
	});

	describe('claimStakingRewardWizardSteps', () => {
		const mockParams = {
			i18n: en
		};

		it('should return the correct steps with expected text and state', () => {
			const steps = claimStakingRewardWizardSteps(mockParams);

			expect(steps).toStrictEqual([
				{
					name: WizardStepsClaimStakingReward.REVIEW,
					title: en.stake.text.claim_rewards
				},
				{
					name: WizardStepsClaimStakingReward.CLAIMING,
					title: en.stake.text.executing_transaction
				}
			]);
		});
	});
});
