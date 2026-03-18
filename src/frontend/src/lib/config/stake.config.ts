import { goto } from '$app/navigation';
import { HARVEST_AUTOPILOT_URL } from '$eth/constants/harvest-autopilots.constants';
import { AppPath } from '$lib/constants/routes.constants';
import {
	WizardStepsClaimStakingReward,
	WizardStepsStake,
	WizardStepsUnstake
} from '$lib/enums/wizard-steps';
import { StakeProvider, type StakeProviderConfig } from '$lib/types/stake';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '@dfinity/gix-components';

export const stakeWizardSteps = ({ i18n }: WizardStepsParams): WizardSteps<WizardStepsStake> => [
	{
		name: WizardStepsStake.STAKE,
		title: i18n.stake.text.stake
	},
	{
		name: WizardStepsStake.REVIEW,
		title: i18n.stake.text.review
	},
	{
		name: WizardStepsStake.STAKING,
		title: i18n.stake.text.executing_transaction
	}
];

export const unstakeWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsUnstake> => [
	{
		name: WizardStepsUnstake.UNSTAKE,
		title: i18n.stake.text.unstake
	},
	{
		name: WizardStepsUnstake.REVIEW,
		title: i18n.stake.text.review
	},
	{
		name: WizardStepsUnstake.UNSTAKING,
		title: i18n.stake.text.executing_transaction
	}
];

export const claimStakingRewardWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsClaimStakingReward> => [
	{
		name: WizardStepsClaimStakingReward.REVIEW,
		title: i18n.stake.text.claim_rewards
	},
	{
		name: WizardStepsClaimStakingReward.CLAIMING,
		title: i18n.stake.text.executing_transaction
	}
];

export const stakeProvidersConfig: Record<StakeProvider, StakeProviderConfig> = {
	[StakeProvider.GLDT]: {
		name: 'Gold DAO',
		description: 'Gold DAO',
		logo: '/images/dapps/gold-dao-logo.svg',
		url: 'https://app.gldt.org/earn/',
		card: {
			titles: ['earning.cards.gldt.title1', 'earning.cards.gldt.title2'],
			action: () => goto(AppPath.EarnGold)
		}
	},
	[StakeProvider.HARVEST_AUTOPILOTS]: {
		name: 'Harvest - Autopilot',
		description: 'Harvest Autopilot: Smart Yield Farming',
		logo: '/images/dapps/harvest-autopilot-logo.svg',
		url: `${HARVEST_AUTOPILOT_URL}autopilot/`,
		card: {
			titles: ['earning.cards.harvest_autopilot.title'],
			action: () => goto(AppPath.EarnAutopilot)
		}
	}
};
