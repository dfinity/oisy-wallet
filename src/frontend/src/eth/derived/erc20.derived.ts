import { enabledEthereumNetworksIds } from '$eth/derived/networks.derived';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { erc20TokensStore } from '$eth/stores/erc20.store';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const erc20DefaultTokens: Readable<Erc20Token[]> = derived(
	[erc20TokensStore, enabledEthereumNetworksIds],
	([$erc20TokensStore, $enabledEthereumNetworksIds]) =>
		($erc20TokensStore ?? []).filter(({ network: { id: networkId } }) =>
			$enabledEthereumNetworksIds.includes(networkId)
		)
);

export const erc20UserTokens: Readable<Erc20UserToken[]> = derived(
	[erc20UserTokensStore],
	([$erc20UserTokensStore]) => $erc20UserTokensStore?.map(({ data: token }) => token) ?? []
);

const erc20UserTokensEnabled: Readable<Erc20UserToken[]> = derived(
	[erc20UserTokens],
	([$erc20UserTokens]) => $erc20UserTokens.filter(({ enabled }) => enabled)
);

export const erc20Tokens: Readable<Erc20Token[]> = derived(
	[erc20DefaultTokens, erc20UserTokensEnabled],
	([$erc20DefaultTokens, $erc20UserTokensEnabled]) => [
		...$erc20DefaultTokens,
		...$erc20UserTokensEnabled
	]
);

export const erc20TokensInitialized: Readable<boolean> = derived([erc20Tokens], ([$erc20Tokens]) =>
	nonNullish($erc20Tokens)
);

export const erc20TokensNotInitialized: Readable<boolean> = derived(
	[erc20TokensInitialized],
	([$erc20TokensInitialized]) => !$erc20TokensInitialized
);

export const erc20TokensAddresses: Readable<Erc20ContractAddress[]> = derived(
	[erc20Tokens],
	([$erc20Tokens]) => $erc20Tokens.map(({ address }: Erc20Token) => ({ address }))
);
