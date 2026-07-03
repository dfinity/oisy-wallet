import { enabledNonFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import { nftStore } from '$lib/stores/nft.store';
import type { Nft } from '$lib/types/nft';
import { getEnabledNfts } from '$lib/utils/nfts.utils';
import { derived, type Readable } from 'svelte/store';

// The NFTs the user holds on enabled non-fungible tokens — the same set the
// NFTs list renders (before its search filter / sort). Used by the NFTs page
// hero so its total always matches the list.
export const enabledNfts: Readable<Nft[]> = derived(
	[nftStore, enabledNonFungibleNetworkTokens],
	([$nftStore, $enabledNonFungibleNetworkTokens]) =>
		getEnabledNfts({ $nftStore, $enabledNonFungibleNetworkTokens })
);
