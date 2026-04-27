<script lang="ts">
	import {
		type ProgressStep,
		WizardModal,
		type WizardStep,
		type WizardSteps
	} from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Identity } from '@icp-sdk/core/agent';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { onDestroy } from 'svelte';
	import HideTokenReview from '$lib/components/tokens/HideTokenReview.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { pageTokenToggleable } from '$lib/derived/page-token.derived';
	import { ProgressStepsHideToken } from '$lib/enums/progress-steps';
	import { WizardStepsHideToken } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { back, gotoReplaceRoot } from '$lib/utils/nav.utils';

	interface Props {
		onAssertHide: () => { valid: boolean };
		onHideToken: (params: { identity: Identity }) => Promise<void>;
		onUpdateUi: (params: { identity: Identity }) => Promise<void>;
		fromRoute?: NavigationTarget;
	}

	let { onAssertHide, onHideToken, onUpdateUi, fromRoute }: Props = $props();

	const hide = async () => {
		const { valid } = onAssertHide();

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
			return;
		}

		if (isNullish(modal)) {
			return;
		}

		modal.next();

		try {
			hideProgressStep = ProgressStepsHideToken.HIDE;

			await onHideToken({
				identity: $authIdentity
			});

			hideProgressStep = ProgressStepsHideToken.UPDATE_UI;

			await onUpdateUi({
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

	let hideProgressStep = $state<ProgressStepsHideToken>(ProgressStepsHideToken.INITIALIZATION);

	let currentStep = $state<WizardStep<WizardStepsHideToken> | undefined>();
	let modal = $state<WizardModal<WizardStepsHideToken>>();

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

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsHideToken.HIDING}
			<InProgressWizard
				progressStep={hideProgressStep}
				steps={HIDE_TOKEN_STEPS}
				warningType="manage"
			/>
		{:else if currentStep?.name === WizardStepsHideToken.HIDE}
			<HideTokenReview onCancel={close} onHide={hide} />
		{/if}
	{/key}
</WizardModal>
