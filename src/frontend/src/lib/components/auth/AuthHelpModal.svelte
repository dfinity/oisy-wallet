<script lang="ts">
    import {WizardModal, type WizardStep, type WizardSteps} from '@dfinity/gix-components';
    import {closeModal} from "$lib/utils/modal.utils";
    import {authHelpWizardSteps} from "$lib/config/auth-help.config";
    import {WizardStepsAuthHelp} from "$lib/enums/wizard-steps";
    import AuthHelpForm from "$lib/components/auth/AuthHelpForm.svelte";
    import AuthHelpIdentityForm from "$lib/components/auth/AuthHelpIdentityForm.svelte";
    import {goToWizardStep} from "$lib/utils/wizard-modal.utils";
    import {i18n} from "$lib/stores/i18n.store";
    import AuthHelpOtherForm from "$lib/components/auth/AuthHelpOtherForm.svelte";

    let modal: WizardModal;

    let steps: WizardSteps;
    $: steps = authHelpWizardSteps({i18n: $i18n});

    let currentStep: WizardStep | undefined;

    const close = () =>
        closeModal(() => {
            currentStep = undefined;
            dispatch('nnsClose');
        });

    const onBack = () => goToWizardStep({modal, steps, stepName: WizardStepsAuthHelp.OVERVIEW});
    const onLostIdentity = () => goToWizardStep({modal, steps, stepName: WizardStepsAuthHelp.HELP_IDENTITY});
    const onOther = () => goToWizardStep({modal, steps, stepName: WizardStepsAuthHelp.HELP_OTHERS});
</script>

<WizardModal
    {steps}
    bind:this={modal}
    bind:currentStep
    on:nnsClose={close}
>
    <svelte:fragment slot="title">
        <span class="text-xl">{currentStep.title}</span>
    </svelte:fragment>

    {#if currentStep?.name === WizardStepsAuthHelp.OVERVIEW}
        <AuthHelpForm {onLostIdentity} {onOther} />
    {:else if currentStep?.name === WizardStepsAuthHelp.HELP_IDENTITY}
        <AuthHelpIdentityForm {onBack} onDone={close} />
    {:else if currentStep?.name === WizardStepsAuthHelp.HELP_OTHERS}
        <AuthHelpOtherForm />
    {/if}
</WizardModal>