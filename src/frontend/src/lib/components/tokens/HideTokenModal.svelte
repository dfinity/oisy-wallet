<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import {
		type ProgressStep,
		WizardModal,
		type WizardStep,
		type WizardSteps
	} from '@dfinity/gix-components';
	import { toastsError } from '$lib/stores/toasts.store';
	import { isNullish } from '@dfinity/utils';
	import { authStore } from '$lib/stores/auth.store';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { ProgressStepsHideToken } from '$lib/enums/progress-steps';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import HideTokenReview from '$lib/components/tokens/HideTokenReview.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { back } from '$lib/utils/nav.utils';
	import type { Identity } from '@dfinity/agent';
	import { token } from '$lib/derived/token.derived';
	import type { NetworkId } from '$lib/types/network';

	export let assertHide: () => { valid: boolean };
	export let hideToken: (params: { identity: Identity }) => Promise<void>;
	export let updateUi: (params: { identity: Identity }) => Promise<void>;
	export let backToNetworkId: NetworkId;

	const hide = async () => {
		const { valid } = assertHide();

		if (!valid) {
			return;
		}

		if ($token.category !== 'custom') {
			toastsError({
				msg: { text: $i18n.tokens.error.not_custom }
			});
			return;
		}

		if (isNullish($authStore.identity)) {
			await nullishSignOut();
			return;
		}

		modal.next();

		try {
			hideProgressStep = ProgressStepsHideToken.HIDE;

			await hideToken({
				identity: $authStore.identity
			});

			hideProgressStep = ProgressStepsHideToken.UPDATE_UI;

			// We must navigate first otherwise we might land on the default token Ethereum selected while being on network ICP.
			await back({ networkId: backToNetworkId });

			await updateUi({
				identity: $authStore.identity
			});

			hideProgressStep = ProgressStepsHideToken.DONE;

			setTimeout(close, 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_hiding },
				err
			});

			modal.back();
		}
	};

	const steps: WizardSteps = [
		{
			name: 'Hide',
			title: $i18n.tokens.hide.title
		},
		{
			name: 'Hiding',
			title: $i18n.tokens.hide.hiding
		}
	];

	const HIDE_TOKEN_STEPS: [ProgressStep, ...ProgressStep[]] = [
		{
			step: ProgressStepsHideToken.INITIALIZATION,
			text: $i18n.tokens.text.initializing,
			state: 'in_progress'
		} as ProgressStep,
		{
			step: ProgressStepsHideToken.HIDE,
			text: $i18n.tokens.hide.hiding,
			state: 'next'
		} as ProgressStep,
		{
			step: ProgressStepsHideToken.UPDATE_UI,
			text: $i18n.tokens.text.updating_ui,
			state: 'next'
		} as ProgressStep
	];

	let hideProgressStep: string = ProgressStepsHideToken.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => {
		modalStore.close();

		hideProgressStep = ProgressStepsHideToken.INITIALIZATION;
	};
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === 'Hiding'}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Hiding'}
		<InProgressWizard progressStep={hideProgressStep} steps={HIDE_TOKEN_STEPS} />
	{:else}
		<HideTokenReview on:icCancel={close} on:icHide={hide} />
	{/if}
</WizardModal>
