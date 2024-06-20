<script lang="ts">
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import ManageTokens from '$icp-eth/components/tokens/ManageTokens.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import IcAddTokenReview from '$icp/components/tokens/IcAddTokenReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import { isNullish } from '@dfinity/utils';
	import { authStore } from '$lib/stores/auth.store';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { toastsError } from '$lib/stores/toasts.store';
	import { saveCustomTokens } from '$icp/services/ic-custom-tokens.services';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { ETHEREUM_NETWORK_ID, ICP_NETWORK_ID } from '$env/networks.env';
	import AddTokenReview from '$eth/components/tokens/AddTokenReview.svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { addUserToken } from '$lib/api/backend.api';
	import { selectedChainId, selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { erc20TokensStore } from '$eth/stores/erc20.store';
	import { mapErc20Token } from '$eth/utils/erc20.utils';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import type { Network } from '$lib/types/network';

	const steps: WizardSteps = [
		{
			name: 'Manage',
			title: $i18n.tokens.manage.text.title
		},
		{
			name: 'Import',
			title: $i18n.tokens.import.text.title
		},
		{
			name: 'Review',
			title: $i18n.tokens.import.text.review
		},
		{
			name: 'Saving',
			title: $i18n.tokens.import.text.saving
		}
	];

	let saveProgressStep: string = ProgressStepsAddToken.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const saveTokens = async ({ detail: tokens }: CustomEvent<IcrcCustomToken[]>) => {
		await save(tokens);
	};

	const addToken = async () => {
		await save([
			{
				enabled: true,
				ledgerCanisterId,
				indexCanisterId
			}
		]);
	};

	const save = async (
		tokens: Pick<IcrcCustomToken, 'enabled' | 'version' | 'ledgerCanisterId' | 'indexCanisterId'>[]
	) => {
		if (isNullish($authStore.identity)) {
			await nullishSignOut();
			return;
		}

		if (tokens.length === 0) {
			toastsError({
				msg: { text: $i18n.tokens.manage.error.empty }
			});
			return;
		}

		modal.set(3);

		try {
			await saveCustomTokens({
				identity: $authStore.identity,
				tokens,
				progress: (step: ProgressStepsAddToken) => (saveProgressStep = step)
			});

			saveProgressStep = ProgressStepsAddToken.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected },
				err
			});

			modal.set(0);
		}
	};

	let erc20Metadata: Erc20Metadata | undefined;

	const saveErc20Token = async () => {
		if (isNullishOrEmpty(erc20ContractAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_contract_address }
			});
			return;
		}

		if (isNullish(erc20Metadata)) {
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
			saveProgressStep = ProgressStepsAddToken.SAVE;

			await addUserToken({
				identity: $authStore.identity,
				token: {
					chain_id: $selectedChainId,
					contract_address: erc20ContractAddress,
					symbol: [],
					decimals: [],
					version: []
				}
			});

			saveProgressStep = ProgressStepsAddToken.UPDATE_UI;

			erc20TokensStore.add(
				mapErc20Token({
					address: erc20ContractAddress,
					exchange: 'ethereum',
					category: 'custom',
					network: $selectedEthereumNetwork,
					...erc20Metadata
				})
			);

			saveProgressStep = ProgressStepsAddToken.DONE;

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

		saveProgressStep = ProgressStepsAddToken.INITIALIZATION;
	};

	let ledgerCanisterId = '';
	let indexCanisterId = '';
	let erc20ContractAddress = '';

	let network: Network | undefined = $selectedNetwork;
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === 'Saving'}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Review'}
		{#if network?.id === ICP_NETWORK_ID}
			<IcAddTokenReview
				on:icBack={modal.back}
				on:icSave={addToken}
				{ledgerCanisterId}
				{indexCanisterId}
			/>
		{:else if network?.id === ETHEREUM_NETWORK_ID}
			<AddTokenReview
				on:icBack={modal.back}
				on:icSave={saveErc20Token}
				contractAddress={erc20ContractAddress}
				bind:metadata={erc20Metadata}
			/>
		{/if}
	{:else if currentStep?.name === 'Saving'}
		<InProgressWizard progressStep={saveProgressStep} steps={addTokenSteps($i18n)} />
	{:else if currentStep?.name === 'Import'}
		<IcAddTokenForm
			on:icBack={modal.back}
			on:icNext={modal.next}
			bind:ledgerCanisterId
			bind:indexCanisterId
		/>
	{:else}
		<ManageTokens on:icClose={close} on:icAddToken={modal.next} on:icSave={saveTokens} />
	{/if}
</WizardModal>
