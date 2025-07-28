<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { get } from 'svelte/store';
	import EthAddTokenReview from '$eth/components/tokens/EthAddTokenReview.svelte';
	import type { SaveUserToken } from '$eth/services/erc20-user-tokens.services';
	import {
		saveErc20UserTokens,
		saveErc721CustomTokens
	} from '$eth/services/manage-tokens.services';
	import { saveErc20CustomTokens } from '$eth/services/manage-tokens.services.js';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import type { SaveErc20CustomToken } from '$eth/types/erc20-custom-token.js';
	import type { Erc721Metadata } from '$eth/types/erc721';
	import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
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
	import type { SolAddress } from '$lib/types/address';
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
	import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';

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
	let modal: WizardModal<WizardStepsManageTokens> | undefined = $state();

	const saveTokens = async ({ detail: tokens }: CustomEvent<Record<string, Token>>) => {
		await saveAllCustomTokens({
			tokens,
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

	const saveEthToken = async () => {
		if (isNullishOrEmpty(ethContractAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_contract_address }
			});
			return;
		}

		if (isNullish(ethMetadata)) {
			toastsError({
				msg: { text: $i18n.tokens.error.no_metadata }
			});
			return;
		}

		if (ethMetadata.decimals > 0) {
			await saveErc20Deprecated([
				{
					address: ethContractAddress,
					...ethMetadata,
					network: network as EthereumNetwork,
					enabled: true
				}
			]);

			await saveErc20([
				{
					address: ethContractAddress,
					...ethMetadata,
					network: network as EthereumNetwork,
					enabled: true
				}
			]);
		} else {
			await saveErc721([
				{
					address: ethContractAddress,
					...ethMetadata,
					network: network as EthereumNetwork,
					enabled: true
				}
			]);
		}
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

	// TODO: UserToken is deprecated - remove this when the migration to CustomToken is complete
	const saveErc20Deprecated = (tokens: SaveUserToken[]): Promise<void> =>
		saveErc20UserTokens({
			tokens,
			progress,
			modalNext: () => modal?.set(3),
			onSuccess: close,
			onError: () => modal?.set(0),
			identity: $authIdentity
		});

	const saveErc20 = (tokens: SaveErc20CustomToken[]): Promise<void> =>
		saveErc20CustomTokens({
			tokens,
			progress,
			modalNext: () => modal?.set(3),
			onSuccess: close,
			onError: () => modal?.set(0),
			identity: $authIdentity
		});

	const saveErc721 = (tokens: SaveErc721CustomToken[]): Promise<void> =>
		saveErc721CustomTokens({
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

	let ethContractAddress: string | undefined = $state();
	let ethMetadata: Erc20Metadata | Erc721Metadata | undefined = $state();

	let splTokenAddress: SolAddress | undefined = $state();
	let splMetadata: TokenMetadata | undefined = $state();

	let network: Network | undefined = $state($selectedNetwork);
	let tokenData: Partial<AddTokenData> = $state({});

	$effect(() => {
		({ ledgerCanisterId, indexCanisterId, ethContractAddress, splTokenAddress } = tokenData);
	});
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	onClose={close}
	disablePointerEvents={currentStep?.name === 'Saving'}
	testId={MANAGE_TOKENS_MODAL}
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

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
				on:icSave={saveEthToken}
				contractAddress={ethContractAddress}
				{network}
				bind:metadata={ethMetadata}
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
