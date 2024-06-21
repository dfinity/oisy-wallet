<script lang="ts">
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import ManageTokens from '$icp-eth/components/tokens/ManageTokens.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import IcAddTokenReview from '$icp/components/tokens/IcAddTokenReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { saveIcrcCustomToken } from '$icp/services/ic-custom-tokens.services';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import AddTokenByNetwork from '$icp-eth/components/tokens/AddTokenByNetwork.svelte';
	import type { Network } from '$lib/types/network';
	import AddTokenReview from '$eth/components/tokens/AddTokenReview.svelte';
	import { isNetworkIdEthereum, isNetworkIdICP } from '$lib/utils/network.utils';
	import { saveErc20Contract } from '$eth/services/erc20.services';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import type { EthereumNetwork } from '$eth/types/network';

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

	const saveErc20Token = async () => {
		await saveErc20Contract({
			contractAddress: erc20ContractAddress,
			metadata: erc20Metadata,
			network: network as EthereumNetwork,
			updateSaveProgressStep: progress,
			modalNext: modal.next,
			onSuccess: close,
			onError: modal.back,
			identity: $authStore.identity
		});
	};

	const progress = (step: ProgressStepsAddToken) => (saveProgressStep = step);

	const save = async (
		tokens: Pick<IcrcCustomToken, 'enabled' | 'version' | 'ledgerCanisterId' | 'indexCanisterId'>[]
	) => {
		await saveIcrcCustomToken({
			tokens,
			progress,
			modalNext: () => modal.set(3),
			onSuccess: close,
			onError: () => modal.set(0),
			identity: $authStore.identity
		});
	};

	const close = () => {
		modalStore.close();

		saveProgressStep = ProgressStepsAddToken.INITIALIZATION;
	};

	let ledgerCanisterId = '';
	let indexCanisterId = '';

	let erc20ContractAddress = '';
	let erc20Metadata: Erc20Metadata | undefined;

	let network: Network | undefined = $selectedNetwork;
	let tokenData: Record<string, string> = {};

	$: tokenData, ({ ledgerCanisterId, indexCanisterId, erc20ContractAddress } = tokenData);
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
		{#if isNetworkIdICP(network?.id)}
			<IcAddTokenReview
				on:icBack={modal.back}
				on:icSave={addToken}
				{ledgerCanisterId}
				{indexCanisterId}
			/>
		{:else if isNetworkIdEthereum(network?.id)}
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
		<AddTokenByNetwork on:icBack={modal.back} on:icNext={modal.next} bind:network bind:tokenData />
	{:else}
		<ManageTokens on:icClose={close} on:icAddToken={modal.next} on:icSave={saveTokens} />
	{/if}
</WizardModal>
