import { enabledEthereumNetworksIds } from '$eth/derived/networks.derived';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { Erc721TokenToggleable } from '$eth/types/erc721-token-toggleable';
import { enabledEvmNetworksIds } from '$evm/derived/networks.derived';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The list of ERC721 tokens the user has added, enabled or disabled.
 */
export const erc721CustomTokens: Readable<Erc721CustomToken[]> = derived(
	[erc721CustomTokensStore, enabledEthereumNetworksIds, enabledEvmNetworksIds],
	([$erc721CustomTokensStore, $enabledEthereumNetworksIds, $enabledEvmNetworksIds]) =>
		$erc721CustomTokensStore?.reduce<Erc721CustomToken[]>((acc, { data: token }) => {
			const {
				network: { id: networkId }
			} = token;

			if ([...$enabledEthereumNetworksIds, ...$enabledEvmNetworksIds].includes(networkId)) {
				return [...acc, token];
			}

			return acc;
		}, []) ?? []
);

/**
 * The list of all ERC721 tokens.
 */
export const erc721Tokens: Readable<Erc721TokenToggleable[]> = derived(
	[erc721CustomTokens],
	([$erc721CustomTokens]) => [...$erc721CustomTokens]
);

export const erc721CustomTokensInitialized: Readable<boolean> = derived(
	[erc721CustomTokensStore],
	([$erc721CustomTokensStore]) => nonNullish($erc721CustomTokensStore)
);
