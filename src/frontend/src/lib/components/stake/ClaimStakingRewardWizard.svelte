<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import GldtClaimStakingRewardWizard from '$icp/components/stake/gldt/GldtClaimStakingRewardWizard.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Amount } from '$lib/types/send';
	import { StakeProvider } from '$lib/types/stake';

	interface Props {
		rewardAmount: Amount;
		provider: StakeProvider;
		claimStakingRewardProgressStep: string;
		currentStep?: WizardStep;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}

	let {
		rewardAmount,
		claimStakingRewardProgressStep = $bindable(),
		currentStep,
		provider,
		onClose,
		onNext,
		onBack
	}: Props = $props();
</script>

{#if provider === StakeProvider.GLDT}
	<GldtClaimStakingRewardWizard
		{currentStep}
		{onBack}
		{onClose}
		{onNext}
		{rewardAmount}
		bind:claimStakingRewardProgressStep
	/>
{:else}
	<MessageBox styleClass="mt-6">{$i18n.stake.text.unsupported_token_staking}</MessageBox>
{/if}
