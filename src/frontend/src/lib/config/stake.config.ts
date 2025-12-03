import {
	WizardStepsClaimStakingReward,
	WizardStepsStake,
	WizardStepsUnstake
} from '$lib/enums/wizard-steps';
import { StakeProvider, type StakeProviderConfig } from '$lib/types/stake';
import type { WizardStepsParams } from '$lib/types/steps';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { WizardSteps } from '@dfinity/gix-components';

export interface StakeWizardStepsParams extends WizardStepsParams {
	tokenSymbol: string;
}

export const stakeWizardSteps = ({
	i18n,
	tokenSymbol
}: StakeWizardStepsParams): WizardSteps<WizardStepsStake> => [
	{
		name: WizardStepsStake.STAKE,
		title: replacePlaceholders(i18n.stake.text.stake, {
			$token_symbol: tokenSymbol
		})
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
	i18n,
	tokenSymbol
}: StakeWizardStepsParams): WizardSteps<WizardStepsUnstake> => [
	{
		name: WizardStepsUnstake.UNSTAKE,
		title: replacePlaceholders(i18n.stake.text.unstake_token, {
			$token_symbol: tokenSymbol
		})
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
		logo: '/images/dapps/gold-dao-logo.svg',
		url: 'https://app.gldt.org/earn/',
		pageDescriptionKey: 'stake.text.gldt_stake_page_description',
		cardTitle: 'earning.providers.gold-dao-staking.cardTitle'
	}
};
