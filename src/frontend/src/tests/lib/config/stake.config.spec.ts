import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import HarvestStakeWizard from '$eth/components/stake/harvest-autopilot/HarvestStakeWizard.svelte';
import HarvestUnstakeWizard from '$eth/components/stake/harvest-autopilot/HarvestUnstakeWizard.svelte';
import {
	claimStakingRewardWizardSteps,
	getStakeWizardComponent,
	getUnstakeWizardComponent,
	stakeWizardSteps,
	unstakeWizardSteps
} from '$lib/config/stake.config';
import {
	WizardStepsClaimStakingReward,
	WizardStepsStake,
	WizardStepsUnstake
} from '$lib/enums/wizard-steps';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';

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

	describe('getStakeWizardComponent', () => {
		it('should return the Harvest stake wizard for a Harvest Autopilot vault token', () => {
			expect(getStakeWizardComponent(BAUTOPILOT_USDC_TOKEN)).toBe(HarvestStakeWizard);
		});

		it('should return undefined for a token without a registered stake wizard', () => {
			expect(getStakeWizardComponent(mockValidIcrcToken)).toBeUndefined();
		});
	});

	describe('getUnstakeWizardComponent', () => {
		it('should return the Harvest unstake wizard for a Harvest Autopilot vault token', () => {
			expect(getUnstakeWizardComponent(BAUTOPILOT_USDC_TOKEN)).toBe(HarvestUnstakeWizard);
		});

		it('should return undefined for a token without a registered unstake wizard', () => {
			expect(getUnstakeWizardComponent(mockValidIcrcToken)).toBeUndefined();
		});
	});
});
