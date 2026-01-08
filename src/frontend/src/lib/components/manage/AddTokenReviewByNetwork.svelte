<script lang="ts">
	import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
	import { get } from 'svelte/store';
	import EthAddTokenReview from '$eth/components/tokens/EthAddTokenReview.svelte';
	import { isInterfaceErc1155 } from '$eth/services/erc1155.services';
	import { isInterfaceErc721 } from '$eth/services/erc721.services';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import type { Erc721Metadata } from '$eth/types/erc721';
	import IcAddExtTokenReview from '$icp/components/tokens/IcAddExtTokenReview.svelte';
	import IcAddIcrcTokenReview from '$icp/components/tokens/IcAddIcrcTokenReview.svelte';
	import type { ValidateTokenData as ValidateExtTokenData } from '$icp/services/ext-add-custom-tokens.service';
	import type { ValidateTokenData as ValidateIcrcTokenData } from '$icp/services/ic-add-custom-tokens.service';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import { TRACK_UNRECOGNISED_ERC_INTERFACE } from '$lib/constants/analytics.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { saveCustomTokensWithKey } from '$lib/services/manage-tokens.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
	import type { Network } from '$lib/types/network';
	import type { TokenMetadata } from '$lib/types/token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		assertIsNetworkEthereum,
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdICP,
		isNetworkIdSolana,
		isNetworkIdSOLDevnet
	} from '$lib/utils/network.utils';
	import SolAddTokenReview from '$sol/components/tokens/SolAddTokenReview.svelte';

	interface Props {
		network?: Network;
		tokenData: Partial<AddTokenData>;
		// eslint-disable-next-line svelte/require-event-prefix -- We are passing the exact argument name as defined in the component
		progress: (step: ProgressStepsAddToken) => void;
		// eslint-disable-next-line svelte/require-event-prefix -- We are passing the exact argument name as defined in the component
		modalNext: () => void;
		onSuccess: () => void;
		onError: () => void;
		onBack: () => void;
		isNftsPage?: boolean;
	}

	let {
		network,
		tokenData,
		progress,
		modalNext,
		onSuccess,
		onError,
		onBack,
		isNftsPage = false
	}: Props = $props();

	const addIcrcToken = async () => {
		if (isNullish(ledgerCanisterId)) {
			toastsError({
				msg: { text: get(i18n).tokens.import.error.missing_ledger_id }
			});
			return;
		}

		await saveTokens([
			{
				enabled: true,
				networkKey: 'Icrc',
				ledgerCanisterId,
				indexCanisterId
			}
		]);
	};

	const addExtToken = async () => {
		if (isNullish(extCanisterId)) {
			toastsError({
				msg: { text: get(i18n).tokens.import.error.missing_canister_id }
			});
			return;
		}

		await saveTokens([
			{
				enabled: true,
				networkKey: 'ExtV2',
				canisterId: extCanisterId
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
		assertIsNetworkEthereum(network);

		const newToken = {
			address: ethContractAddress,
			chainId: network.chainId,
			enabled: true
		};

		const isErc721 = await isInterfaceErc721({
			address: ethContractAddress,
			networkId: network.id
		});

		if (isErc721) {
			await saveTokens([{ ...newToken, networkKey: 'Erc721' }]);

			return;
		}

		const isErc1155 = await isInterfaceErc1155({
			address: ethContractAddress,
			networkId: network.id
		});

		if (isErc1155) {
			await saveTokens([{ ...newToken, networkKey: 'Erc1155' }]);

			return;
		}

		if (ethMetadata.decimals >= 0) {
			await saveTokens([{ ...newToken, networkKey: 'Erc20' }]);

			return;
		}

		trackEvent({
			name: TRACK_UNRECOGNISED_ERC_INTERFACE,
			metadata: {
				address: newToken.address,
				network: `${network.id.description}`
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

		// This does not happen at this point, but it is useful type-wise
		assertNonNullish(network);

		saveTokens([
			{
				address: splTokenAddress,
				...splMetadata,
				enabled: true,
				networkKey: isNetworkIdSOLDevnet(network.id) ? 'SplDevnet' : 'SplMainnet'
			}
		]);
	};

	const saveTokens = (tokens: SaveCustomTokenWithKey[]): Promise<void> =>
		saveCustomTokensWithKey({
			tokens,
			progress,
			modalNext,
			onSuccess,
			onError,
			identity: $authIdentity
		});

	let icrcMetadata: ValidateIcrcTokenData | undefined = $state();

	let extMetadata: ValidateExtTokenData | undefined = $state();

	let ethMetadata: Erc20Metadata | Erc721Metadata | undefined = $state();

	let splMetadata: TokenMetadata | undefined = $state();

	let { ledgerCanisterId, indexCanisterId, extCanisterId, ethContractAddress, splTokenAddress } =
		$derived(tokenData);
</script>

{#if isNetworkIdICP(network?.id)}
	{#if isNftsPage}
		<IcAddExtTokenReview
			{extCanisterId}
			{onBack}
			onSave={addExtToken}
			bind:metadata={extMetadata}
		/>
	{:else}
		<IcAddIcrcTokenReview
			{indexCanisterId}
			{ledgerCanisterId}
			{onBack}
			onSave={addIcrcToken}
			bind:metadata={icrcMetadata}
		/>
	{/if}
{:else if nonNullish(network) && (isNetworkIdEthereum(network?.id) || isNetworkIdEvm(network?.id))}
	<EthAddTokenReview
		contractAddress={ethContractAddress}
		{network}
		{onBack}
		onSave={saveEthToken}
		bind:metadata={ethMetadata}
	/>
{:else if nonNullish(network) && isNetworkIdSolana(network?.id)}
	<SolAddTokenReview
		{network}
		{onBack}
		onSave={saveSplToken}
		tokenAddress={splTokenAddress}
		bind:metadata={splMetadata}
	/>
{/if}
