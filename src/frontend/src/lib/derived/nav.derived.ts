import { page } from '$app/stores';
import { TokenTypes as TokenTypesEnum, type TokenTypes } from '$lib/enums/token-types';
import { navStore } from '$lib/stores/nav.store';
import type { NetworkId } from '$lib/types/network';
import type { OptionString } from '$lib/types/string';
import { parseNetworkId } from '$lib/validation/network.validation';
import { nonNullish } from '@dfinity/utils';
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

export const userSelectedNetwork: Readable<NetworkId | undefined> = derived(
	[navStore],
	([$navStore]) =>
		nonNullish($navStore?.userSelectedNetwork)
			? parseNetworkId($navStore.userSelectedNetwork)
			: undefined
);

export const selectedAssetsTab: Readable<TokenTypes> = derived(
	[navStore],
	([$navStore]) => $navStore?.activeAssetsTab ?? TokenTypesEnum.TOKENS
);
