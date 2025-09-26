<script lang="ts">
	import type { Identity } from '@dfinity/agent';
	import {
		type ProgressStep,
		WizardModal,
		type WizardStep,
		type WizardSteps
	} from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { onDestroy } from 'svelte';
	import HideTokenReview from '$lib/components/tokens/HideTokenReview.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { pageTokenToggleable } from '$lib/derived/page-token.derived';
	import { ProgressStepsHideToken } from '$lib/enums/progress-steps';
	import { WizardStepsHideToken } from '$lib/enums/wizard-steps';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { back, gotoReplaceRoot } from '$lib/utils/nav.utils';

	export let assertHide: () => { valid: boolean };
	export let hideToken: (params: { identity: Identity }) => Promise<void>;
	export let updateUi: (params: { identity: Identity }) => Promise<void>;
	export let fromRoute: NavigationTarget | undefined;

	const hide = async () => {
		const { valid } = assertHide();

		if (!valid) {
			return;
		}

		if (!$pageTokenToggleable) {
			toastsError({
				msg: { text: $i18n.tokens.error.not_toggleable }
			});
			return;
		}

		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		modal.next();

		try {
			hideProgressStep = ProgressStepsHideToken.HIDE;

			await hideToken({
				identity: $authIdentity
			});

			hideProgressStep = ProgressStepsHideToken.UPDATE_UI;

			await updateUi({
				identity: $authIdentity
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

	const steps: WizardSteps<WizardStepsHideToken> = [
		{
			name: WizardStepsHideToken.HIDE,
			title: $i18n.tokens.hide.title
		},
		{
			name: WizardStepsHideToken.HIDING,
			title: $i18n.tokens.hide.hiding
		}
	];

	const HIDE_TOKEN_STEPS: ProgressSteps = [
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

	let currentStep: WizardStep<WizardStepsHideToken> | undefined;
	let modal: WizardModal<WizardStepsHideToken>;

	const close = () => {
		modalStore.close();

		hideProgressStep = ProgressStepsHideToken.INITIALIZATION;
	};

	onDestroy(async () =>
		nonNullish(fromRoute) ? await back({ pop: nonNullish(fromRoute) }) : await gotoReplaceRoot()
	);
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsHideToken.HIDING}
	onClose={close}
	{steps}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#if currentStep?.name === WizardStepsHideToken.HIDING}
		<InProgressWizard
			progressStep={hideProgressStep}
			steps={HIDE_TOKEN_STEPS}
			warningType="manage"
		/>
	{:else if currentStep?.name === WizardStepsHideToken.HIDE}
		<HideTokenReview on:icCancel={close} on:icHide={hide} />
	{/if}
</WizardModal>
