<script lang="ts">
	import type { Identity } from '@dfinity/agent';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { get } from 'svelte/store';
	import type { CustomToken } from '$declarations/backend/backend.did';
	import { SUPPORTED_EVM_MAINNET_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
	import { SUPPORTED_ETHEREUM_MAINNET_NETWORKS } from '$env/networks/networks.eth.env';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import { saveCustomTokens as saveErc1155CustomTokens } from '$eth/services/erc1155-custom-tokens.services';
	import { saveCustomTokens as saveErc721CustomTokens } from '$eth/services/erc721-custom-tokens.services';
	import type { SaveErc1155CustomToken } from '$eth/types/erc1155-custom-token';
	import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
	import type { EthereumNetwork } from '$eth/types/network';
	import { listCustomTokens } from '$lib/api/backend.api';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OwnedContract } from '$lib/types/nft';
	import type { NonEmptyArray } from '$lib/types/utils';
	import { areAddressesEqual } from '$lib/utils/address.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const handleErc721 = async ({
		contracts,
		customTokens,
		network,
		identity
	}: {
		contracts: OwnedContract[];
		customTokens: CustomToken[];
		network: EthereumNetwork;
		identity: Identity;
	}) => {
		const tokens = contracts.reduce<SaveErc721CustomToken[]>((acc, contract) => {
			const existingToken = customTokens.find(({ token }) => {
				if (!('Erc721' in token)) {
					return false;
				}

				const {
					Erc721: { token_address: tokenAddress, chain_id: tokenChainId }
				} = token;

				return areAddressesEqual({address1: tokenAddress, address2: contract.address, networkId: network.id}) && tokenChainId === network.chainId;
			});
			if (nonNullish(existingToken)) {
				return acc;
			}

			const newToken: SaveErc721CustomToken = {
				address: contract.address,
				network,
				enabled: !contract.isSpam
			};

			return [...acc, newToken];
		}, []);

		if (tokens.length > 0) {
			await saveErc721CustomTokens({
				tokens: tokens as NonEmptyArray<SaveErc721CustomToken>,
				identity
			});
		}
	};

	const handleErc1155 = async ({
		contracts,
		customTokens,
		network,
		identity
	}: {
		contracts: OwnedContract[];
		customTokens: CustomToken[];
		network: EthereumNetwork;
		identity: Identity;
	}) => {
		const tokens = contracts.reduce<SaveErc1155CustomToken[]>((acc, contract) => {
			const existingToken = customTokens.find(({ token }) => {
				if (!('Erc1155' in token)) {
					return false;
				}

				const {
					Erc1155: { token_address: tokenAddress, chain_id: tokenChainId }
				} = token;

				return areAddressesEqual({address1: tokenAddress, address2: contract.address, networkId: network.id}) && tokenChainId === network.chainId;
			});
			if (nonNullish(existingToken)) {
				return acc;
			}

			const newToken: SaveErc1155CustomToken = {
				address: contract.address,
				network,
				enabled: !contract.isSpam
			};

			return [...acc, newToken];
		}, []);

		if (tokens.length > 0) {
			await saveErc1155CustomTokens({
				tokens: tokens as NonEmptyArray<SaveErc1155CustomToken>,
				identity
			});
		}
	};

	const loadContracts = async (network: EthereumNetwork): Promise<OwnedContract[]> => {
		if (isNullish($ethAddress)) {
			return [];
		}

		const { getTokensForOwner } = alchemyProviders(network.id);

		try {
			return await getTokensForOwner($ethAddress);
		} catch (_: unknown) {
			return [];
		}
	};

	const onLoad = async () => {
		if (!NFTS_ENABLED || isNullish($authIdentity)) {
			return;
		}

		const tokens = await listCustomTokens({
			identity: $authIdentity,
			certified: true,
			nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
		});

		const customErc721Tokens = tokens.filter(({ token }) => 'Erc721' in token);
		const customErc1155Tokens = tokens.filter(({ token }) => 'Erc1155' in token);

		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS];
		for (const network of networks) {
			const contracts: OwnedContract[] = await loadContracts(network);

			const erc721Contracts = contracts.filter(
				(contract) => contract.standard.toLowerCase() === 'erc721'
			);
			const erc1155Contracts = contracts.filter(
				(contract) => contract.standard.toLowerCase() === 'erc1155'
			);

			await handleErc721({
				contracts: erc721Contracts,
				customTokens: customErc721Tokens,
				network,
				identity: $authIdentity
			});
			await handleErc1155({
				contracts: erc1155Contracts,
				customTokens: customErc1155Tokens,
				network,
				identity: $authIdentity
			});
		}
	};
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad}>
	{@render children?.()}
</IntervalLoader>
