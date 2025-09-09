<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
	import { loadNftsByNetwork } from '$lib/services/nft.services';
	import { nftStore } from '$lib/stores/nft.store';
	import type { NetworkId } from '$lib/types/network';
	import type { Nft, NftId, NonFungibleToken } from '$lib/types/nft';
	import { findRemovedNfts, getUpdatedNfts } from '$lib/utils/nfts.utils';
	import { getTokensByNetwork } from '$lib/utils/nft.utils';

	interface Props {
		skipInitialLoad?: boolean;
		children?: Snippet;
	}

	let { skipInitialLoad = true, children }: Props = $props();

	const handleRemovedNfts = ({
		token,
		inventory
	}: {
		token: NonFungibleToken;
		inventory: NftId[];
	}) => {
		const removedNfts = findRemovedNfts({ nfts: $nftStore ?? [], token, inventory });

		if (removedNfts.length > 0) {
			nftStore.removeSelectedNfts(removedNfts);
		}
	};

	const handleUpdatedNfts = ({
		token,
		inventory
	}: {
		token: NonFungibleToken;
		inventory: Nft[];
	}) => {
		const updatedNfts = getUpdatedNfts({ nfts: $nftStore ?? [], token, inventory });

		if (updatedNfts.length > 0) {
			nftStore.updateSelectedNfts(updatedNfts);
		}
	};

	const onLoad = async () => {
		if (!NFTS_ENABLED || isNullish($ethAddress)) {
			return;
		}

		const tokensByNetwork = getTokensByNetwork($enabledNonFungibleTokens)

		for (const [networkId, tokens] of tokensByNetwork) {
			const nfts = await loadNftsByNetwork({ networkId, tokens, walletAddress: $ethAddress });

			tokens.forEach((token) => {
				const filteredNfts = nfts.filter(
					(nft) =>
						nft.collection.address === token.address && nft.collection.network === token.network
				);

				handleRemovedNfts({ token, inventory: filteredNfts.map((nft) => nft.id) });

				if (isTokenErc1155(token)) {
					handleUpdatedNfts({ token, inventory: nfts });
				}

				nftStore.addAll(filteredNfts);
			});
		}
	};
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad} {skipInitialLoad}>
	{@render children?.()}
</IntervalLoader>
