<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import AuthHelpForm from '$lib/components/auth/AuthHelpForm.svelte';
	import AuthHelpIdentityForm from '$lib/components/auth/AuthHelpIdentityForm.svelte';
	import AuthHelpOtherForm from '$lib/components/auth/AuthHelpOtherForm.svelte';
	import { authHelpWizardSteps } from '$lib/config/auth-help.config';
	import { WizardStepsAuthHelp } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	export let usesIdentityHelp = false;

	let modal: WizardModal<WizardStepsAuthHelp>;

	let steps: WizardSteps<WizardStepsAuthHelp>;
	$: steps = authHelpWizardSteps({ i18n: $i18n });

	let currentStep: WizardStep<WizardStepsAuthHelp> | undefined;

	let titleString: string;
	$: titleString = currentStep?.title ?? $i18n.auth.help.text.title;

	onMount(() => {
		if (usesIdentityHelp && nonNullish(modal) && nonNullish(steps)) {
			goToWizardStep({ modal, steps, stepName: WizardStepsAuthHelp.HELP_IDENTITY });
		}
	});

	const close = () =>
		closeModal(() => {
			currentStep = undefined;
		});

	const onBack = () => goToWizardStep({ modal, steps, stepName: WizardStepsAuthHelp.OVERVIEW });
	const onLostIdentity = () =>
		goToWizardStep({ modal, steps, stepName: WizardStepsAuthHelp.HELP_IDENTITY });
	const onOther = () => goToWizardStep({ modal, steps, stepName: WizardStepsAuthHelp.HELP_OTHER });
</script>

<WizardModal bind:this={modal} onClose={close} {steps} bind:currentStep>
	{#snippet title()}
		<span class="text-xl">{titleString}</span>
	{/snippet}

	{#if currentStep?.name === WizardStepsAuthHelp.OVERVIEW}
		<AuthHelpForm {onLostIdentity} {onOther} />
	{:else if currentStep?.name === WizardStepsAuthHelp.HELP_IDENTITY}
		<AuthHelpIdentityForm hideBack={usesIdentityHelp} {onBack} onDone={close} />
	{:else if currentStep?.name === WizardStepsAuthHelp.HELP_OTHER}
		<AuthHelpOtherForm {onBack} onDone={close} />
	{/if}
</WizardModal>
