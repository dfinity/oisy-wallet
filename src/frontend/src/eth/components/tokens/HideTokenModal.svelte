<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { isNullish } from '@dfinity/utils';
	import { authStore } from '$lib/stores/auth.store';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { HideTokenStep } from '$lib/enums/steps';
	import { removeUserToken } from '$lib/api/backend.api';
	import { selectedChainId } from '$eth/derived/network.derived';
	import { erc20TokensStore } from '$eth/stores/erc20.store';
	import { HIDE_TOKEN_STEPS } from '$lib/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import HideTokenReview from '$eth/components/tokens/HideTokenReview.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { token, tokenId } from '$lib/derived/token.derived';
	import type { Erc20Token } from '$eth/types/erc20';
	import { back } from '$lib/utils/nav.utils';
	import { ETHEREUM_NETWORK_ID } from '$env/networks.env';

	const hide = async () => {
		const contractAddress = ($token as Erc20Token).address;

		if (isNullishOrEmpty(contractAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_contract_address }
			});
			return;
		}

		if (isNullish($authStore.identity)) {
			await nullishSignOut();
			return;
		}

		modal.next();

		try {
			hideProgressStep = HideTokenStep.HIDE;

			await removeUserToken({
				identity: $authStore.identity,
				tokenId: {
					chain_id: $selectedChainId,
					contract_address: contractAddress
				}
			});

			hideProgressStep = HideTokenStep.UPDATE_UI;

			erc20TokensStore.remove($tokenId);

			hideProgressStep = HideTokenStep.DONE;

			setTimeout(async () => {
				close();

				await back({ networkId: ETHEREUM_NETWORK_ID, pop: true });
			}, 750);
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

	let hideProgressStep: string = HideTokenStep.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => {
		modalStore.close();

		hideProgressStep = HideTokenStep.INITIALIZATION;
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
