import { erc20TokensStore } from '$lib/stores/erc20.store';
import type { Erc20Token } from '$lib/types/erc20';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const erc20Tokens: Readable<Erc20Token[]> = derived(
	[erc20TokensStore],
	([$erc20TokensStore]) => $erc20TokensStore ?? []
);

export const erc20TokensInitialized: Readable<boolean> = derived(
	[erc20TokensStore],
	([$erc20TokensStore]) => nonNullish($erc20TokensStore)
);
