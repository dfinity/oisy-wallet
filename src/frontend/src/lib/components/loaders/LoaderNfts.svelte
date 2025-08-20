<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { etherscanProviders } from '$eth/providers/etherscan.providers';
	import type { InfuraErc165Provider } from '$eth/providers/infura-erc165.providers';
	import { infuraErc721Providers } from '$eth/providers/infura-erc721.providers';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
	import { loadNftIdsOfToken } from '$lib/services/nft.services';
	import { nftStore } from '$lib/stores/nft.store';
	import type { NftId, NonFungibleToken } from '$lib/types/nft';
	import { findNewNftIds } from '$lib/utils/nfts.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const handleErc721 = async (token: NonFungibleToken) => {
		if (isNullish($ethAddress)) {
			return;
		}

		const etherscanProvider = etherscanProviders(token.network.id);

		let inventory: NftId[];
		try {
			inventory = await etherscanProvider.erc721TokenInventory({
				address: $ethAddress,
				contractAddress: token.address
			});
		} catch (_: unknown) {
			inventory = [];
		}

		handleNewNfts({
			token,
			inventory,
			infuraProvider: infuraErc721Providers(token.network.id)
		});
	};

	const handleNewNfts = ({
		token,
		inventory,
		infuraProvider
	}: {
		token: NonFungibleToken;
		inventory: NftId[];
		infuraProvider: InfuraErc165Provider;
	}) => {
		if (isNullish($ethAddress)) {
			return;
		}

		const newNftIds = findNewNftIds({ nfts: $nftStore ?? [], token, inventory });

		if (newNftIds.length > 0) {
			loadNftIdsOfToken({
				infuraProvider,
				token,
				tokenIds: newNftIds,
				walletAddress: $ethAddress
			}).catch(console.error);
		}
	};

	const onLoad = async () => {
		for (const token of $enabledNonFungibleTokens) {
			if (token.standard === 'erc721') {
				await handleErc721(token);
			}
		}
	};
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad}>
	{@render children?.()}
</IntervalLoader>
