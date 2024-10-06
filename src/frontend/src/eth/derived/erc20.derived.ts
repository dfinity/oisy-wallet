import { enabledEthereumNetworksIds } from '$eth/derived/networks.derived';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import type { ContractAddressText } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import { derived, type Readable } from 'svelte/store';

/**
 * The list of ERC20 default tokens - i.e. the statically configured ERC20 tokens of Oisy + their metadata, unique ids etc. fetched at runtime.
 */
const erc20DefaultTokens: Readable<Erc20Token[]> = derived(
	[erc20DefaultTokensStore, enabledEthereumNetworksIds],
	([$erc20TokensStore, $enabledEthereumNetworksIds]) =>
		($erc20TokensStore ?? []).filter(({ network: { id: networkId } }) =>
			$enabledEthereumNetworksIds.includes(networkId)
		)
);

/**
 * The list of all ERC20 tokens.
 */
export const erc20Tokens: Readable<Erc20Token[]> = derived(
	[erc20DefaultTokens],
	([$erc20DefaultTokens]) => $erc20DefaultTokens
);

export const enabledErc20TokensAddresses: Readable<ContractAddressText[]> = derived(
	[erc20Tokens],
	([$erc20Tokens]) => $erc20Tokens.map(({ address }: Erc20Token) => address)
);
