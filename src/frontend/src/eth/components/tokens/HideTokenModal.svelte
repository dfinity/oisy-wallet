<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { isNullish } from '@dfinity/utils';
	import { authStore } from '$lib/stores/auth.store';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { AddTokenStep, HideTokenStep } from '$lib/enums/steps';
	import { addUserToken } from '$lib/api/backend.api';
	import { selectedChainId, selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { erc20TokensStore } from '$eth/stores/erc20.store';
	import { mapErc20Token } from '$eth/utils/erc20.utils';
	import { HIDE_TOKEN_STEPS } from '$lib/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import HideTokenReview from '$eth/components/tokens/HideTokenReview.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	const hide = async () => {
		modal.next();

		try {
			hideProgressStep = HideTokenStep.HIDE;

			// TODO
			// await addUserToken({
			// 	identity: $authStore.identity,
			// 	token: {
			// 		chain_id: $selectedChainId,
			// 		contract_address: contractAddress,
			// 		symbol: [],
			// 		decimals: []
			// 	}
			// });

			hideProgressStep = HideTokenStep.UPDATE_UI;

			// TODO
			// erc20TokensStore.add(
			// 	mapErc20Token({
			// 		address: contractAddress,
			// 		exchange: 'ethereum',
			// 		network: $selectedEthereumNetwork,
			// 		...metadata
			// 	})
			// );

			hideProgressStep = HideTokenStep.DONE;

			setTimeout(() => close(), 750);
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
	on:nnsClose
	disablePointerEvents={currentStep?.name === 'Hiding'}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Saving'}
		<InProgressWizard progressStep={hideProgressStep} steps={HIDE_TOKEN_STEPS} />
	{:else}
		<HideTokenReview on:icCancel={close} on:icHide={hide} />
	{/if}
</WizardModal>
