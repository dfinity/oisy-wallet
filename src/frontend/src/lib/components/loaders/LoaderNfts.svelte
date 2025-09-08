<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
	import { nftStore } from '$lib/stores/nft.store';
	import type { Nft, NftId, NonFungibleToken } from '$lib/types/nft';
	import { findRemovedNfts, getUpdatedNfts } from '$lib/utils/nfts.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

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

		for (const token of $enabledNonFungibleTokens) {
			const { getNftsByOwner } = alchemyProviders(token.network.id);

			try {
				const nfts = await getNftsByOwner({ address: $ethAddress, token });

				handleRemovedNfts({ token, inventory: nfts.map((nft) => nft.id) });

				if (isTokenErc1155(token)) {
					handleUpdatedNfts({ token, inventory: nfts });
				}

				nftStore.addAll(nfts);
			} catch (_: unknown) {
				console.warn(
					`Failed to fetch NFTs for token: ${token.address} on network: ${token.network.id.toString()}.`
				);
			}
		}
	};
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad}>
	{@render children?.()}
</IntervalLoader>
