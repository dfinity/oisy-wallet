<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { SUPPORTED_EVM_MAINNET_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
	import { SUPPORTED_ETHEREUM_MAINNET_NETWORKS } from '$env/networks/networks.eth.env';
	import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { EtherscanProvider, etherscanProviders } from '$eth/providers/etherscan.providers';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import type { EthAddress } from '$lib/types/address';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const onLoad = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS]
		for (const network of networks) {
			const etherscanProvider = etherscanProviders(network.id)

			const contractAddresses = await loadContractAddresses(etherscanProvider)

			const newTokens = contractAddresses.reduce<SaveErc721CustomToken[]>((acc, contractAddress) => {
				const existingToken = $nonFungibleTokens.find((token) => token.address === contractAddress && token.network.id === network.id)
				if (nonNullish(existingToken)) {
					return acc;
				}

				const newToken: SaveErc721CustomToken = {
					address: contractAddress,
					network,
					enabled: true
				}
				acc.push(newToken)

				return acc;
			}, []);

			for(const token of newTokens) {
				token.enabled = await isContractVerified({etherscanProvider, contractAddress: token.address})
			}

			// await saveErc721CustomTokens({identity: $authIdentity, tokens: newTokens})
		}
	};

	const loadContractAddresses = async (etherscanProvider: EtherscanProvider) => {
		try {
			return await etherscanProvider.erc721TokenHolding('0x065aef9729d4df33a4b7ff408cbd145e2a80c34c')
		} catch (_: unknown) {
			return []
		}
	}

	const isContractVerified = async ({etherscanProvider, contractAddress}:
																		{ etherscanProvider: EtherscanProvider, contractAddress: EthAddress }): Promise<boolean> => {
		try {
			return nonNullish(await etherscanProvider.contractAbi(contractAddress))
		} catch (_: unknown) {
			return false
		}
	}
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad}>
	{@render children?.()}
</IntervalLoader>