<script lang="ts">
	import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
	import { get } from 'svelte/store';
	import { NFTS_ENABLED } from '$env/nft.env';
	import EthAddTokenReview from '$eth/components/tokens/EthAddTokenReview.svelte';
	import { isInterfaceErc1155 } from '$eth/services/erc1155.services';
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
	import type { SaveUserToken } from '$eth/types/erc20-user-token';
	import type { Erc721Metadata } from '$eth/types/erc721';
	import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
	import type { EthereumNetwork } from '$eth/types/network';
	import IcAddExtTokenReview from '$icp/components/tokens/IcAddExtTokenReview.svelte';
	import IcAddIcrcTokenReview from '$icp/components/tokens/IcAddIcrcTokenReview.svelte';
	import type { ValidateTokenData as ValidateExtTokenData } from '$icp/services/ext-add-custom-tokens.service';
	import type { ValidateTokenData as ValidateIcrcTokenData } from '$icp/services/ic-add-custom-tokens.service';
	import { saveIcrcCustomTokens } from '$icp/services/manage-tokens.services';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import { TRACK_UNRECOGNISED_ERC_INTERFACE } from '$lib/constants/analytics.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
	import type { Network } from '$lib/types/network';
	import type { TokenMetadata } from '$lib/types/token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';
	import SolAddTokenReview from '$sol/components/tokens/SolAddTokenReview.svelte';
	import { saveSplCustomTokens } from '$sol/services/manage-tokens.services';
	import type { SolanaNetwork } from '$sol/types/network';
	import type { SaveSplCustomToken } from '$sol/types/spl-custom-token';

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

	const saveIcrc = (tokens: SaveCustomTokenWithKey[]): Promise<void> =>
		saveIcrcCustomTokens({
			tokens,
			progress,
			modalNext,
			onSuccess,
			onError,
			identity: $authIdentity
		});

	// TODO: UserToken is deprecated - remove this when the migration to CustomToken is complete
	const saveErc20Deprecated = (tokens: SaveUserToken[]): Promise<void> =>
		saveErc20UserTokens({
			tokens,
			progress,
			modalNext,
			onSuccess,
			onError,
			identity: $authIdentity
		});

	const saveErc20 = (tokens: SaveErc20CustomToken[]): Promise<void> =>
		saveErc20CustomTokens({
			tokens,
			progress,
			modalNext,
			onSuccess,
			onError,
			identity: $authIdentity
		});

	const saveErc721 = (tokens: SaveErc721CustomToken[]): Promise<void> =>
		saveErc721CustomTokens({
			tokens,
			progress,
			modalNext,
			onSuccess,
			onError,
			identity: $authIdentity
		});

	const saveErc1155 = (tokens: SaveErc1155CustomToken[]): Promise<void> =>
		saveErc1155CustomTokens({
			tokens,
			progress,
			modalNext,
			onSuccess,
			onError,
			identity: $authIdentity
		});

	const saveSpl = (tokens: SaveSplCustomToken[]): Promise<void> =>
		saveSplCustomTokens({
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
		<!-- TODO: add logic to add an EXT token -->
		<IcAddExtTokenReview {extCanisterId} {onBack} onSave={() => {}} bind:metadata={extMetadata} />
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
