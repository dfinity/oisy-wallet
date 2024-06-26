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
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import AddTokenByNetwork from '$icp-eth/components/tokens/AddTokenByNetwork.svelte';
	import type { Network } from '$lib/types/network';
	import AddTokenReview from '$eth/components/tokens/AddTokenReview.svelte';
	import { isNetworkIdEthereum, isNetworkIdICP } from '$lib/utils/network.utils';
	import { saveErc20Contract } from '$eth/services/erc20.services';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import { isNullish } from '@dfinity/utils';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { get } from 'svelte/store';
	import type { Erc20UserToken } from '$eth/types/erc20-user-token';
	import {
		saveErc20UserTokens,
		saveIcrcCustomTokens
	} from '$icp-eth/services/manage-tokens.services';
	import type { SaveCustomToken } from '$icp/services/ic-custom-tokens.services';

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

	let saveProgressStep: ProgressStepsAddToken = ProgressStepsAddToken.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const saveTokens = async ({
		detail: { icrc, erc20 }
	}: CustomEvent<{ icrc: IcrcCustomToken[]; erc20: Erc20UserToken[] }>) => {
		if (icrc.length === 0 && erc20.length === 0) {
			toastsShow({
				text: $i18n.tokens.manage.info.no_changes,
				level: 'info',
				duration: 5000
			});

			return;
		}

		await Promise.allSettled([
			...(icrc.length > 0 ? [saveIcrc(icrc)] : []),
			...(erc20.length > 0 ? [saveErc20(erc20)] : [])
		]);
	};

	const addToken = async () => {
		if (isNullish(ledgerCanisterId)) {
			toastsError({
				msg: { text: get(i18n).tokens.import.error.missing_ledger_id }
			});
			return;
		}

		if (isNullish(indexCanisterId)) {
			toastsError({
				msg: { text: get(i18n).tokens.import.error.missing_index_id }
			});
			return;
		}

		await saveIcrc([
			{
				enabled: true,
				ledgerCanisterId,
				indexCanisterId
			}
		]);
	};

	const saveErc20Token = async () => {
		// TODO: deprecated
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

	const saveIcrc = (tokens: SaveCustomToken[]): Promise<void> =>
		saveIcrcCustomTokens({
			tokens,
			progress,
			modalNext: () => modal.set(3),
			onSuccess: close,
			onError: () => modal.set(0),
			identity: $authStore.identity
		});

	const saveErc20 = (tokens: Erc20UserToken[]): Promise<void> =>
		saveErc20UserTokens({
			tokens,
			progress,
			modalNext: () => modal.set(3),
			onSuccess: close,
			onError: () => modal.set(0),
			identity: $authStore.identity
		});

	const close = () => {
		modalStore.close();

		saveProgressStep = ProgressStepsAddToken.INITIALIZATION;
	};

	let ledgerCanisterId: string | undefined;
	let indexCanisterId: string | undefined;

	let erc20ContractAddress: string | undefined;
	let erc20Metadata: Erc20Metadata | undefined;

	let network: Network | undefined = $selectedNetwork;
	let tokenData: Partial<AddTokenData> = {};

	$: tokenData,
		({ ledgerCanisterId, indexCanisterId, contractAddress: erc20ContractAddress } = tokenData);
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
				{network}
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
