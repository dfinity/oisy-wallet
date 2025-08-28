<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { get } from 'svelte/store';
	import { NFTS_ENABLED } from '$env/nft.env';
	import EthAddTokenReview from '$eth/components/tokens/EthAddTokenReview.svelte';
	import { isInterfaceErc1155 } from '$eth/services/erc1155.services';
	import type { SaveUserToken } from '$eth/services/erc20-user-tokens.services';
	import { isInterfaceErc721 } from '$eth/services/erc721.services';
	import {
		saveErc1155CustomTokens,
		saveErc20UserTokens,
		saveErc721CustomTokens
	} from '$eth/services/manage-tokens.services';
	import { saveErc20CustomTokens } from '$eth/services/manage-tokens.services.js';
	import type { SaveErc1155CustomToken } from '$eth/types/erc1155-custom-token';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import type { SaveErc20CustomToken } from '$eth/types/erc20-custom-token.js';
	import type { Erc721Metadata } from '$eth/types/erc721';
	import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
	import type { EthereumNetwork } from '$eth/types/network';
	import IcAddTokenReview from '$icp/components/tokens/IcAddTokenReview.svelte';
	import type { ValidateTokenData } from '$icp/services/ic-add-custom-tokens.service';
	import { saveIcrcCustomTokens } from '$icp/services/manage-tokens.services';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import AddTokenByNetwork from '$lib/components/manage/AddTokenByNetwork.svelte';
	import ManageTokens from '$lib/components/manage/ManageTokens.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { TRACK_UNRECOGNISED_ERC_INTERFACE } from '$lib/constants/analytics.contants';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import { MANAGE_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { WizardStepsManageTokens } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
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
				...icrcMetadata,
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

		// This does not happen at this point, but it is useful type-wise
		assertNonNullish(network);

		const newToken = {
			address: ethContractAddress,
			...ethMetadata,
			network: network as EthereumNetwork,
			enabled: true
		};

		if (NFTS_ENABLED) {
			const isErc721 = await isInterfaceErc721({
				address: ethContractAddress,
				networkId: network.id
			});

			if (isErc721) {
				await saveErc721([newToken]);

				return;
			}

			const isErc1155 = await isInterfaceErc1155({
				address: ethContractAddress,
				networkId: network.id
			});

			if (isErc1155) {
				await saveErc1155([newToken]);

				return;
			}
		}

		if (ethMetadata.decimals > 0) {
			await saveErc20Deprecated([newToken]);

			await saveErc20([newToken]);

			return;
		}

		trackEvent({
			name: TRACK_UNRECOGNISED_ERC_INTERFACE,
			metadata: {
				address: newToken.address,
				network: `${newToken.network.id.description}`
			}
		});

		// In case we are not able to determine the token standard, we display an error message
		toastsError({
			msg: { text: $i18n.tokens.error.unrecognised_erc_interface }
		});
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

	const saveErc1155 = (tokens: SaveErc1155CustomToken[]): Promise<void> =>
		saveErc1155CustomTokens({
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
	let icrcMetadata: ValidateTokenData | undefined = $state();

	let ethContractAddress: string | undefined = $state();
	let ethMetadata: Erc20Metadata | Erc721Metadata | undefined = $state();

	let splTokenAddress: string | undefined = $state();
	let splMetadata: TokenMetadata | undefined = $state();

	let network: Network | undefined = $state($selectedNetwork);
	let tokenData: Partial<AddTokenData> = $state({});

	$effect(() => {
		({ ledgerCanisterId, indexCanisterId, ethContractAddress, splTokenAddress } = tokenData);
	});
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === 'Saving'}
	onClose={close}
	{steps}
	testId={MANAGE_TOKENS_MODAL}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#if currentStep?.name === 'Review'}
		{#if isNetworkIdICP(network?.id)}
			<IcAddTokenReview
				{indexCanisterId}
				{ledgerCanisterId}
				on:icBack={modal.back}
				on:icSave={addIcrcToken}
				bind:metadata={icrcMetadata}
			/>
		{:else if nonNullish(network) && (isNetworkIdEthereum(network?.id) || isNetworkIdEvm(network?.id))}
			<EthAddTokenReview
				contractAddress={ethContractAddress}
				{network}
				on:icBack={modal.back}
				on:icSave={saveEthToken}
				bind:metadata={ethMetadata}
			/>
		{:else if nonNullish(network) && isNetworkIdSolana(network?.id)}
			<SolAddTokenReview
				{network}
				tokenAddress={splTokenAddress}
				on:icBack={modal.back}
				on:icSave={saveSplToken}
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
			{infoElement}
			{initialSearch}
			on:icClose={close}
			on:icAddToken={modal.next}
			on:icSave={saveTokens}
		/>
	{/if}
</WizardModal>
