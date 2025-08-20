<script lang="ts">
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import type { Snippet } from 'svelte';
	import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_MAINNET_NETWORKS } from '$env/networks/networks.eth.env';
	import { etherscanProviders } from '$eth/providers/etherscan.providers';
	import type { EthereumNetwork } from '$eth/types/network';
	import { saveCustomTokens as saveErc721CustomTokens } from '$eth/services/erc721-custom-tokens.services';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { erc721Tokens } from '$eth/derived/erc721.derived';
	import type { NonFungibleToken } from '$lib/types/nft';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { SUPPORTED_EVM_MAINNET_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
	import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
	import type { EthAddress } from '$lib/types/address';
	import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const onLoad = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS]
		// for (let network of networks) {
		// 	const contractAddresses = await loadErc721ContractAddresses(network);
		//
		// 	const newTokens = contractAddresses.reduce<SaveErc721CustomToken[]>((acc, contractAddress) => {
		// 		const existingToken = $nonFungibleTokens.find((token) => token.address === contractAddress && token.network.id === network.id)
		// 		if (nonNullish(existingToken)) {
		// 			return acc;
		// 		}
		//
		// 		const newToken: SaveErc721CustomToken = {
		// 			address: contractAddress,
		// 			network,
		// 			enabled: true
		// 		}
		// 		acc.push(newToken)
		//
		// 		return acc;
		// 	}, []);
		//
		// 	await saveErc721CustomTokens({identity: $authIdentity, tokens: newTokens})
		// }
	};

	const loadErc721ContractAddresses = async (network: EthereumNetwork): Promise<EthAddress[]> => {
		const etherscanProvider = etherscanProviders(network.id);

		// TODO maybe also check if contract is verified

		try {
			// TODO replace with $ethAddress
			return await etherscanProvider.erc721TokenHolding('0x065aef9729d4df33a4b7ff408cbd145e2a80c34c')
		} catch (_: unknown) {
			return []
		}
	}
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad}>
	{@render children?.()}
</IntervalLoader>