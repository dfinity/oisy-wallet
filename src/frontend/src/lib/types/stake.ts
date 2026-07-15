import type { EarningCardData } from '$lib/types/earning';
import type { Amount, OptionAmount } from '$lib/types/send';
import type { Token } from '$lib/types/token';
import type { Vault } from '$lib/types/vaults';
import type { WizardStep } from '$lib/types/wizard';
import type { Component } from 'svelte';

export enum StakeProvider {
	HARVEST_AUTOPILOTS = 'harvest_autopilots'
}

export interface ClaimStakingRewardParams {
	token: Token;
	rewardAmount: Amount;
}

export interface StakeProviderConfig {
	name: string;
	description: string;
	logo: string;
	url: string;
	card: EarningCardData;
}

interface StakeWizardBaseProps {
	amount: OptionAmount;
	vault: Vault;
	currentStep?: WizardStep;
	onClose: () => void;
	onNext: () => void;
	onBack: () => void;
}

export interface StakeWizardComponentProps extends StakeWizardBaseProps {
	stakeProgressStep: string;
}

export interface UnstakeWizardComponentProps extends StakeWizardBaseProps {
	unstakeProgressStep: string;
}

export interface StakeWizardEntry {
	matches: (token: Token) => boolean;
	stakeComponent: Component<StakeWizardComponentProps>;
	unstakeComponent: Component<UnstakeWizardComponentProps>;
}
