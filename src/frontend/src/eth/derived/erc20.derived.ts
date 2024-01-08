import { erc20TokensStore } from '$eth/stores/erc20.store';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
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

export const erc20TokensNotInitialized: Readable<boolean> = derived(
	[erc20TokensInitialized],
	([$erc20TokensInitialized]) => !$erc20TokensInitialized
);

export const erc20TokensAddresses: Readable<Erc20ContractAddress[]> = derived(
	[erc20Tokens],
	([$erc20Tokens]) => $erc20Tokens.map(({ address }: Erc20Token) => ({ address }))
);
