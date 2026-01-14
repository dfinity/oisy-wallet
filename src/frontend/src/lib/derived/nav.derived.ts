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

export const routeCollection: Readable<OptionString> = derived(
	[page],
	([
		{
			data: { collection }
		}
	]) => collection
);

export const routeNft: Readable<OptionString> = derived(
	[page],
	([
		{
			data: { nft }
		}
	]) => nft
);
