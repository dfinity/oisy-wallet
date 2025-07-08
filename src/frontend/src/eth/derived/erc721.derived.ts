import { derived, type Readable } from 'svelte/store';
import type { Erc721TokenToggleable } from '$eth/types/erc721-token-toggleable';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { enabledEthereumNetworksIds } from '$eth/derived/networks.derived';
import { enabledEvmNetworksIds } from '$evm/derived/networks.derived';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';

export const erc721CustomTokens: Readable<Erc721CustomToken[]> = derived(
	[erc721CustomTokensStore, enabledEthereumNetworksIds, enabledEvmNetworksIds],
	([$erc721CustomTokensStore, $enabledEthereumNetworksIds, $enabledEvmNetworksIds]) =>
		$erc721CustomTokensStore?.reduce<Erc721CustomToken[]>((acc, {data: token}) => {
			const {
				network: { id: networkId }
			} = token;

			if ([...$enabledEthereumNetworksIds, ...$enabledEvmNetworksIds].includes(networkId)) {
				return [...acc, token];
			}

			return acc;
		}, []) ?? []
);

const erc721CustomTokensToggleable: Readable<Erc721CustomToken[]> = derived(
	[erc721CustomTokens],
	([$erc721CustomTokens]) => [])

export const erc721Tokens: Readable<Erc721TokenToggleable[]> = derived(
	[erc721CustomTokensToggleable],
	([$erc721CustomTokensToggleable]) => [...$erc721CustomTokensToggleable]);