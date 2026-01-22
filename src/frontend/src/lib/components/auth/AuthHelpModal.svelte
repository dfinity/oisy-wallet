<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import AuthHelpForm from '$lib/components/auth/AuthHelpForm.svelte';
	import AuthHelpLegacyIdentityForm from '$lib/components/auth/AuthHelpLegacyIdentityForm.svelte';
	import AuthHelpNewIdentityForm from '$lib/components/auth/AuthHelpNewIdentityForm.svelte';
	import { authHelpWizardSteps } from '$lib/config/auth-help.config';
	import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { WizardStepsAuthHelp } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		usesIdentityHelp?: boolean;
	}

	let { usesIdentityHelp = false }: Props = $props();

	let modal = $state<WizardModal<WizardStepsAuthHelp>>();

	let steps: WizardSteps<WizardStepsAuthHelp> = $derived(authHelpWizardSteps({ i18n: $i18n }));

	let currentStep = $state<WizardStep<WizardStepsAuthHelp> | undefined>();

	let titleString = $derived(currentStep?.title ?? $i18n.auth.help.text.title);

	onMount(() => {
		if (usesIdentityHelp && nonNullish(modal) && nonNullish(steps)) {
			goToWizardStep({ modal, steps, stepName: WizardStepsAuthHelp.HELP_NEW_IDENTITY });
		}
	});

	const close = () => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
			metadata: { event_value: 'close' }
		});

		closeModal(() => {
			currentStep = undefined;
		});
	};

	const onWizardStepChange = (stepName: WizardStepsAuthHelp) =>
		nonNullish(modal) ? goToWizardStep({ modal, steps, stepName }) : undefined;

	const onBack = () => onWizardStepChange(WizardStepsAuthHelp.OVERVIEW);
	const onOpenLegacyIdentityHelp = () =>
		onWizardStepChange(WizardStepsAuthHelp.HELP_LEGACY_IDENTITY);
	const onOpenNewIdentityHelp = () => onWizardStepChange(WizardStepsAuthHelp.HELP_NEW_IDENTITY);
</script>

<WizardModal bind:this={modal} onClose={close} {steps} bind:currentStep>
	{#snippet title()}
		<span class="text-xl">{titleString}</span>
	{/snippet}

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsAuthHelp.OVERVIEW}
			<AuthHelpForm {onOpenLegacyIdentityHelp} {onOpenNewIdentityHelp} />
		{:else if currentStep?.name === WizardStepsAuthHelp.HELP_LEGACY_IDENTITY}
			<AuthHelpLegacyIdentityForm hideBack={usesIdentityHelp} {onBack} onDone={close} />
		{:else if currentStep?.name === WizardStepsAuthHelp.HELP_NEW_IDENTITY}
			<AuthHelpNewIdentityForm hideBack={usesIdentityHelp} {onBack} onDone={close} />
		{/if}
	{/key}
</WizardModal>
