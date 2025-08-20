<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { SUPPORTED_EVM_MAINNET_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
	import { SUPPORTED_ETHEREUM_MAINNET_NETWORKS } from '$env/networks/networks.eth.env';
	import { type EtherscanProvider, etherscanProviders } from '$eth/providers/etherscan.providers';
	import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
	import type { EthereumNetwork } from '$eth/types/network';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import type { EthAddress } from '$lib/types/address';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const handleErc721 = async (network: EthereumNetwork) => {
		const etherscanProvider = etherscanProviders(network.id);

		const contractAddresses = await loadErc721ContractAddresses(etherscanProvider);

		const newTokens = contractAddresses.reduce<SaveErc721CustomToken[]>((acc, contractAddress) => {
			const existingToken = $nonFungibleTokens.find(
				(token) => token.address === contractAddress && token.network.id === network.id
			);
			if (nonNullish(existingToken)) {
				return acc;
			}

			const newToken: SaveErc721CustomToken = {
				address: contractAddress,
				network,
				enabled: true
			};
			acc.push(newToken);

			return acc;
		}, []);

		for (const token of newTokens) {
			token.enabled = await isContractVerified({
				etherscanProvider,
				contractAddress: token.address
			});
		}

		// await saveErc721CustomTokens({identity: $authIdentity, tokens: newTokens})
	};

	const loadErc721ContractAddresses = async (etherscanProvider: EtherscanProvider) => {
		try {
			// TODO replace address with $ethAddress
			return await etherscanProvider.erc721TokenHolding(
				'0x065aef9729d4df33a4b7ff408cbd145e2a80c34c'
			);
		} catch (_: unknown) {
			return [];
		}
	};

	const isContractVerified = async ({
		etherscanProvider,
		contractAddress
	}: {
		etherscanProvider: EtherscanProvider;
		contractAddress: EthAddress;
	}): Promise<boolean> => {
		try {
			return nonNullish(await etherscanProvider.contractAbi(contractAddress));
		} catch (_: unknown) {
			return false;
		}
	};

	const onLoad = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS];
		for (const network of networks) {
			// TODO make it parallel
			await handleErc721(network);
		}
	};
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad}>
	{@render children?.()}
</IntervalLoader>
