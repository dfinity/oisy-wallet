import { goto } from '$app/navigation';
import HarvestStakeWizard from '$eth/components/stake/harvest-autopilot/HarvestStakeWizard.svelte';
import HarvestUnstakeWizard from '$eth/components/stake/harvest-autopilot/HarvestUnstakeWizard.svelte';
import { HARVEST_AUTOPILOT_URL } from '$eth/constants/harvest-autopilots.constants';
import { isTokenHarvestAutopilot } from '$eth/utils/harvest-autopilots.utils';
import { AppPath } from '$lib/constants/routes.constants';
import {
	WizardStepsClaimStakingReward,
	WizardStepsStake,
	WizardStepsUnstake
} from '$lib/enums/wizard-steps';
import { StakeProvider, type StakeProviderConfig, type StakeWizardEntry } from '$lib/types/stake';
import type { WizardStepsParams } from '$lib/types/steps';
import type { Token } from '$lib/types/token';
import type { WizardSteps } from '$lib/types/wizard';

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

const stakeWizardRegistry: StakeWizardEntry[] = [
	{
		matches: isTokenHarvestAutopilot,
		stakeComponent: HarvestStakeWizard,
		unstakeComponent: HarvestUnstakeWizard
	}
];

export const getStakeWizardComponent = (
	token: Token
): StakeWizardEntry['stakeComponent'] | undefined =>
	stakeWizardRegistry.find(({ matches }) => matches(token))?.stakeComponent;

export const getUnstakeWizardComponent = (
	token: Token
): StakeWizardEntry['unstakeComponent'] | undefined =>
	stakeWizardRegistry.find(({ matches }) => matches(token))?.unstakeComponent;
