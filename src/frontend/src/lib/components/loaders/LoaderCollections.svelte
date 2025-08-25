<script lang="ts">
	import type { Identity } from '@dfinity/agent';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { SUPPORTED_EVM_MAINNET_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
	import { SUPPORTED_ETHEREUM_MAINNET_NETWORKS } from '$env/networks/networks.eth.env';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { erc1155Tokens } from '$eth/derived/erc1155.derived';
	import { erc721Tokens } from '$eth/derived/erc721.derived';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import { saveCustomTokens as saveErc1155CustomTokens } from '$eth/services/erc1155-custom-tokens.services';
	import { saveCustomTokens as saveErc721CustomTokens } from '$eth/services/erc721-custom-tokens.services';
	import type { SaveErc1155CustomToken } from '$eth/types/erc1155-custom-token';
	import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
	import type { EthereumNetwork } from '$eth/types/network';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { OwnedContract } from '$lib/types/nft';
	import type { NonEmptyArray } from '$lib/types/utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const handleErc721 = async ({
		contracts,
		network,
		identity
	}: {
		contracts: OwnedContract[];
		network: EthereumNetwork;
		identity: Identity;
	}) => {
		const tokens = contracts.reduce<SaveErc721CustomToken[]>((acc, contract) => {
			const existingToken = $erc721Tokens.find(
				(token) => token.address === contract.address && token.network.id === network.id
			);
			if (nonNullish(existingToken)) {
				return acc;
			}

			const newToken: SaveErc721CustomToken = {
				address: contract.address,
				network,
				enabled: !contract.isSpam
			};
			acc.push(newToken);

			return acc;
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
		network,
		identity
	}: {
		contracts: OwnedContract[];
		network: EthereumNetwork;
		identity: Identity;
	}) => {
		const tokens = contracts.reduce<SaveErc1155CustomToken[]>((acc, contract) => {
			const existingToken = $erc1155Tokens.find(
				(token) => token.address === contract.address && token.network.id === network.id
			);
			if (nonNullish(existingToken)) {
				return acc;
			}

			const newToken: SaveErc1155CustomToken = {
				address: contract.address,
				network,
				enabled: !contract.isSpam
			};
			acc.push(newToken);

			return acc;
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

		const alchemyProvider = alchemyProviders(network.id);

		try {
			return await alchemyProvider.getTokensForOwner($ethAddress);
		} catch (_: unknown) {
			return [];
		}
	};

	const onLoad = async () => {
		if (!NFTS_ENABLED || isNullish($authIdentity)) {
			return;
		}

		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS];
		for (const network of networks) {
			const contracts: OwnedContract[] = await loadContracts(network);

			const erc721Contracts = contracts.filter(
				(contract) => contract.standard.toLowerCase() === 'erc721'
			);
			const erc1155Contracts = contracts.filter(
				(contract) => contract.standard.toLowerCase() === 'erc1155'
			);

			await handleErc721({ contracts: erc721Contracts, network, identity: $authIdentity });
			await handleErc1155({ contracts: erc1155Contracts, network, identity: $authIdentity });
		}
	};
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad}>
	{@render children?.()}
</IntervalLoader>
