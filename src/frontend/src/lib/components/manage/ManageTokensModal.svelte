<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { get } from 'svelte/store';
	import AddTokenReview from '$eth/components/tokens/AddTokenReview.svelte';
	import type { SaveUserToken } from '$eth/services/erc20-user-tokens-services';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import type { Erc20UserToken } from '$eth/types/erc20-user-token';
	import type { EthereumNetwork } from '$eth/types/network';
	import IcAddTokenReview from '$icp/components/tokens/IcAddTokenReview.svelte';
	import type { SaveCustomToken } from '$icp/services/ic-custom-tokens.services';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import {
		saveErc20UserTokens,
		saveIcrcCustomTokens
	} from '$icp-eth/services/manage-tokens.services';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import AddTokenByNetwork from '$lib/components/manage/AddTokenByNetwork.svelte';
	import ManageTokens from '$lib/components/manage/ManageTokens.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { Network } from '$lib/types/network';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isNetworkIdEthereum, isNetworkIdICP } from '$lib/utils/network.utils';

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
			title: $i18n.tokens.import.text.updating
		}
	];

	export let initialSearch: string | undefined = undefined;
	export let onClose: () => void = () => {};
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

	const addIcrcToken = async () => {
		if (isNullish(ledgerCanisterId)) {
			toastsError({
				msg: { text: get(i18n).tokens.import.error.missing_ledger_id }
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

		await saveErc20([
			{
				address: erc20ContractAddress,
				...erc20Metadata,
				network: network as EthereumNetwork,
				enabled: true
			}
		]);
	};

	const progress = (step: ProgressStepsAddToken) => (saveProgressStep = step);

	const saveIcrc = (tokens: SaveCustomToken[]): Promise<void> =>
		saveIcrcCustomTokens({
			tokens,
			progress,
			modalNext: () => modal.set(3),
			onSuccess: close,
			onError: () => modal.set(0),
			identity: $authIdentity
		});

	const saveErc20 = (tokens: SaveUserToken[]): Promise<void> =>
		saveErc20UserTokens({
			tokens,
			progress,
			modalNext: () => modal.set(3),
			onSuccess: close,
			onError: () => modal.set(0),
			identity: $authIdentity
		});

	const close = () => {
		modalStore.close();

		saveProgressStep = ProgressStepsAddToken.INITIALIZATION;
		onClose();
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
				on:icSave={addIcrcToken}
				{ledgerCanisterId}
				{indexCanisterId}
			/>
		{:else if nonNullish(network) && isNetworkIdEthereum(network?.id)}
			<AddTokenReview
				on:icBack={modal.back}
				on:icSave={saveErc20Token}
				contractAddress={erc20ContractAddress}
				{network}
				bind:metadata={erc20Metadata}
			/>
		{/if}
	{:else if currentStep?.name === 'Saving'}
		<InProgressWizard
			progressStep={saveProgressStep}
			steps={addTokenSteps($i18n)}
			warningType="manage"
		/>
	{:else if currentStep?.name === 'Import'}
		<AddTokenByNetwork on:icBack={modal.back} on:icNext={modal.next} bind:network bind:tokenData />
	{:else}
		<ManageTokens
			on:icClose={close}
			on:icAddToken={modal.next}
			on:icSave={saveTokens}
			{initialSearch}
		>
			<svelte:fragment slot="info-element">
				<slot name="info-element" />
			</svelte:fragment>
		</ManageTokens>
	{/if}
</WizardModal>
