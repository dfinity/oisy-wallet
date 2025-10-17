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

// TODO: replace with `data` instead of `params`
export const routeCollection: Readable<OptionString> = derived(
	[page],
	([
		{
			// TODO: collectionId --> collection
			data: { collection }
		}
	]) => {
		console.log('collection', collection);
		return collection;
	}
);

// TODO: replace with `data` instead of `params`
export const routeNft: Readable<OptionString> = derived(
	[page],
	([
		{
			// TODO: nftId --> nft
			data: { nftId }
		}
	]) => nftId
);
