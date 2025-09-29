import { page } from '$app/stores';
import type { OptionString } from '$lib/types/string';
import { derived, type Readable } from 'svelte/store';

export const routeToken: Readable<OptionString> = derived(
	[page],
	([
		{
			data: { token }
		}
	]) => token
);

export const routeNetwork: Readable<OptionString> = derived(
	[page],
	([
		{
			data: { network }
		}
	]) => network
);

// TODO: replace with routeNetwork when the NFT network ID is in `data` instead of `params`
// TODO: confirm that is the ID and not the name of the network that is being passed
export const routeNftNetwork: Readable<OptionString> = derived(
	[page],
	([
		{
			params: { networkId }
		}
	]) => networkId
);

// TODO: replace with `data` instead of `params`
export const routeCollection: Readable<OptionString> = derived(
	[page],
	([
		{
			// TODO: collectionId --> collection
			params: { collectionId }
		}
	]) => collectionId
);

// TODO: replace with `data` instead of `params`
export const routeNft: Readable<OptionString> = derived(
	[page],
	([
		{
			// TODO: nftId --> nft
			params: { nftId }
		}
	]) => nftId
);
