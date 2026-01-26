<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import ClaimStakingRewardWizard from '$lib/components/stake/ClaimStakingRewardWizard.svelte';
	import { claimStakingRewardWizardSteps } from '$lib/config/stake.config';
	import { ProgressStepsClaimStakingReward } from '$lib/enums/progress-steps';
	import { WizardStepsClaimStakingReward } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { StakeProvider, ClaimStakingRewardParams } from '$lib/types/stake';
	import { closeModal } from '$lib/utils/modal.utils';

	interface Props extends ClaimStakingRewardParams {
		provider: StakeProvider;
	}

	let { token, rewardAmount, provider }: Props = $props();

	let modal: WizardModal<WizardStepsClaimStakingReward> | undefined = $state();
	let currentStep: WizardStep<WizardStepsClaimStakingReward> | undefined = $state();
	let claimStakingRewardProgressStep: string = $state(
		ProgressStepsClaimStakingReward.INITIALIZATION
	);

	let steps: WizardSteps<WizardStepsClaimStakingReward> = $derived(
		claimStakingRewardWizardSteps({
			i18n: $i18n
		})
	);

	const reset = () => {
		claimStakingRewardProgressStep = ProgressStepsClaimStakingReward.INITIALIZATION;

		currentStep = undefined;
	};

	const close = () =>
		closeModal(() => {
			reset();
		});
</script>

<SendTokenContext {token}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsClaimStakingReward.CLAIMING}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		<ClaimStakingRewardWizard
			{currentStep}
			onBack={modal.back}
			onClose={close}
			onNext={modal.next}
			{provider}
			{rewardAmount}
			bind:claimStakingRewardProgressStep
		/>
	</WizardModal>
</SendTokenContext>
