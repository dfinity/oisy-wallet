<script lang="ts">
	import CyclesTopUpWizard from '$icp/components/cycles-top-up/CyclesTopUpWizard.svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { cyclesTopUpWizardSteps } from '$lib/config/cycles-top-up.config';
	import { WizardStepsCyclesTopUp } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { WizardStep } from '$lib/types/wizard';
	import { closeModal } from '$lib/utils/modal.utils';

	interface Props {
		// The page's TCYCLES token.
		token: IcToken;
	}

	let { token }: Props = $props();

	let currentStep = $state<WizardStep<WizardStepsCyclesTopUp> | undefined>();
	let modal = $state<WizardModal<WizardStepsCyclesTopUp>>();

	let steps = $derived(cyclesTopUpWizardSteps({ i18n: $i18n }));

	const close = () =>
		closeModal(() => {
			currentStep = undefined;
		});
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsCyclesTopUp.TOPPING_UP}
	onClose={close}
	{steps}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	<CyclesTopUpWizard {currentStep} {modal} onClose={close} {steps} {token} />
</WizardModal>
