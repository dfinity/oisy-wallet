<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { get } from 'svelte/store';
	import EthAddTokenReview from '$eth/components/tokens/EthAddTokenReview.svelte';
	import type { SaveUserToken } from '$eth/services/erc20-user-tokens.services';
	import { saveErc20UserTokens } from '$eth/services/manage-tokens.services';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import type { EthereumNetwork } from '$eth/types/network';
	import IcAddTokenReview from '$icp/components/tokens/IcAddTokenReview.svelte';
	import { saveIcrcCustomTokens } from '$icp/services/manage-tokens.services';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import AddTokenByNetwork from '$lib/components/manage/AddTokenByNetwork.svelte';
	import ManageTokens from '$lib/components/manage/ManageTokens.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import { MANAGE_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { WizardStepsManageTokens } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
	import type { Network } from '$lib/types/network';
	import type { Token, TokenMetadata } from '$lib/types/token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';
	import { saveAllCustomTokens } from '$lib/utils/tokens.utils';
	import SolAddTokenReview from '$sol/components/tokens/SolAddTokenReview.svelte';
	import { saveSplCustomTokens } from '$sol/services/manage-tokens.services';
	import type { SolanaNetwork } from '$sol/types/network';
	import type { SaveSplCustomToken } from '$sol/types/spl-custom-token';

	let {
		initialSearch,
		onClose = () => {},
		infoElement
	}: { initialSearch?: string; onClose?: () => void; infoElement?: Snippet } = $props();

	const steps: WizardSteps<WizardStepsManageTokens> = [
		{
			name: WizardStepsManageTokens.MANAGE,
			title: $i18n.tokens.manage.text.title
		},
		{
			name: WizardStepsManageTokens.IMPORT,
			title: $i18n.tokens.import.text.title
		},
		{
			name: WizardStepsManageTokens.REVIEW,
			title: $i18n.tokens.import.text.review
		},
		{
			name: WizardStepsManageTokens.SAVING,
			title: $i18n.tokens.import.text.updating
		}
	];

	let saveProgressStep: ProgressStepsAddToken = $state(ProgressStepsAddToken.INITIALIZATION);

	let currentStep: WizardStep<WizardStepsManageTokens> | undefined = $state();
	let modal: WizardModal | undefined = $state();

	const saveTokens = async ({
		detail: { modifiedTokens }
	}: CustomEvent<{ modifiedTokens: Record<string, Token> }>) => {
		await saveAllCustomTokens({
			tokens: modifiedTokens,
			progress,
			modalNext: () => modal?.set(3),
			onSuccess: close,
			onError: () => modal?.set(0),
			$authIdentity,
			$i18n
		});
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
				networkKey: 'Icrc',
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

	const saveSplToken = () => {
		if (isNullishOrEmpty(splTokenAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_token_address }
			});
			return;
		}

		if (isNullish(splMetadata)) {
			toastsError({
				msg: { text: $i18n.tokens.error.no_metadata }
			});
			return;
		}

		saveSpl([
			{
				address: splTokenAddress,
				...splMetadata,
				network: network as SolanaNetwork,
				enabled: true
			}
		]);
	};

	const progress = (step: ProgressStepsAddToken) => (saveProgressStep = step);

	const saveIcrc = (tokens: SaveCustomTokenWithKey[]): Promise<void> =>
		saveIcrcCustomTokens({
			tokens,
			progress,
			modalNext: () => modal?.set(3),
			onSuccess: close,
			onError: () => modal?.set(0),
			identity: $authIdentity
		});

	const saveErc20 = (tokens: SaveUserToken[]): Promise<void> =>
		saveErc20UserTokens({
			tokens,
			progress,
			modalNext: () => modal?.set(3),
			onSuccess: close,
			onError: () => modal?.set(0),
			identity: $authIdentity
		});

	const saveSpl = (tokens: SaveSplCustomToken[]): Promise<void> =>
		saveSplCustomTokens({
			tokens,
			progress,
			modalNext: () => modal?.set(3),
			onSuccess: close,
			onError: () => modal?.set(0),
			identity: $authIdentity
		});

	const close = () => {
		modalStore.close();

		saveProgressStep = ProgressStepsAddToken.INITIALIZATION;
		onClose();
	};

	let ledgerCanisterId: string | undefined = $state();
	let indexCanisterId: string | undefined = $state();

	let erc20ContractAddress: string | undefined = $state();
	let erc20Metadata: Erc20Metadata | undefined = $state();

	let splTokenAddress: string | undefined = $state();
	let splMetadata: TokenMetadata | undefined = $state();

	let network: Network | undefined = $state($selectedNetwork);
	let tokenData: Partial<AddTokenData> = $state({});

	$effect(() => {
		({ ledgerCanisterId, indexCanisterId, erc20ContractAddress, splTokenAddress } = tokenData);
	});
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === 'Saving'}
	testId={MANAGE_TOKENS_MODAL}
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
		{:else if nonNullish(network) && (isNetworkIdEthereum(network?.id) || isNetworkIdEvm(network?.id))}
			<EthAddTokenReview
				on:icBack={modal.back}
				on:icSave={saveErc20Token}
				contractAddress={erc20ContractAddress}
				{network}
				bind:metadata={erc20Metadata}
			/>
		{:else if nonNullish(network) && isNetworkIdSolana(network?.id)}
			<SolAddTokenReview
				on:icBack={modal.back}
				on:icSave={saveSplToken}
				tokenAddress={splTokenAddress}
				{network}
				bind:metadata={splMetadata}
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
			{infoElement}
		/>
	{/if}
</WizardModal>
