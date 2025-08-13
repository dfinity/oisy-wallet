import { enabledEthereumNetworksIds } from '$eth/derived/networks.derived';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { Erc1155TokenToggleable } from '$eth/types/erc1155-token-toggleable';
import { enabledEvmNetworksIds } from '$evm/derived/networks.derived';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The list of ERC1155 custom tokens the user has added, enabled or disabled.
 */
export const erc1155CustomTokens: Readable<Erc1155CustomToken[]> = derived(
	[erc1155CustomTokensStore, enabledEthereumNetworksIds, enabledEvmNetworksIds],
	([$erc1155CustomTokensStore, $enabledEthereumNetworksIds, $enabledEvmNetworksIds]) =>
		$erc1155CustomTokensStore?.reduce<Erc1155CustomToken[]>((acc, { data: token }) => {
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
 * The list of all ERC1155 tokens.
 */
export const erc1155Tokens: Readable<Erc1155TokenToggleable[]> = derived(
	[erc1155CustomTokens],
	([$erc1155CustomTokens]) => [...$erc1155CustomTokens]
);

/**
 * The list of all enabled ERC1155 tokens.
 */
export const enabledErc1155Tokens: Readable<Erc1155TokenToggleable[]> = derived(
	[erc1155Tokens],
	([$erc1155Tokens]) => $erc1155Tokens.filter(({ enabled }) => enabled)
);

export const erc1155CustomTokensInitialized: Readable<boolean> = derived(
	[erc1155CustomTokensStore],
	([$erc1155CustomTokensStore]) => nonNullish($erc1155CustomTokensStore)
);
