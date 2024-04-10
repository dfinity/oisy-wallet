<script lang="ts">
	import AddTokenModal from '$lib/components/tokens/AddTokenModal.svelte';
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import AddTokenReview from '$eth/components/tokens/AddTokenReview.svelte';
	import AddTokenForm from '$eth/components/tokens/AddTokenForm.svelte';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNullish } from '@dfinity/utils';
	import { authStore } from '$lib/stores/auth.store';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { AddTokenStep } from '$lib/enums/steps';
	import { addUserToken } from '$lib/api/backend.api';
	import { selectedChainId, selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { erc20TokensStore } from '$eth/stores/erc20.store';
	import { mapErc20CustomToken } from '$eth/utils/erc20.utils';
	import { modalStore } from '$lib/stores/modal.store';

	let saveProgressStep: string = AddTokenStep.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	let contractAddress = '';
	let metadata: Erc20Metadata | undefined;

	const save = async () => {
		if (isNullishOrEmpty(contractAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_contract_address }
			});
			return;
		}

		if (isNullish(metadata)) {
			toastsError({
				msg: { text: $i18n.tokens.error.no_metadata }
			});
			return;
		}

		if (isNullish($authStore.identity)) {
			await nullishSignOut();
			return;
		}

		modal.next();

		try {
			saveProgressStep = AddTokenStep.SAVE;

			await addUserToken({
				identity: $authStore.identity,
				token: {
					chain_id: $selectedChainId,
					contract_address: contractAddress,
					symbol: [],
					decimals: []
				}
			});

			saveProgressStep = AddTokenStep.UPDATE_UI;

			erc20TokensStore.add(
				mapErc20CustomToken({
					address: contractAddress,
					exchange: 'ethereum',
					network: $selectedEthereumNetwork,
					...metadata
				})
			);

			saveProgressStep = AddTokenStep.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected },
				err
			});

			modal.back();
		}
	};

	const close = () => {
		modalStore.close();

		saveProgressStep = AddTokenStep.INITIALIZATION;
	};
</script>

<AddTokenModal bind:saveProgressStep bind:currentStep bind:modal on:icClose={close}>
	{#if currentStep?.name === 'Review'}
		<AddTokenReview on:icBack={modal.back} on:icSave={save} {contractAddress} bind:metadata />
	{:else}
		<AddTokenForm on:icNext={modal.next} on:icClose={close} bind:contractAddress />
	{/if}
</AddTokenModal>
