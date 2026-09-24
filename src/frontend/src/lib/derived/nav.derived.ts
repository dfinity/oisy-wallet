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

// The key mirrors NFT_PARAM (the `collectible` query param), not the internal
// `Nft` naming — `page.data` is untyped, so a stale key here fails silently.
export const routeNft: Readable<OptionString> = derived(
	[page],
	([
		{
			data: { collectible }
		}
	]) => collectible
);

export const routeAutopilotVault: Readable<OptionString> = derived(
	[page],
	([
		{
			data: { vault }
		}
	]) => vault
);
