import { selectedEthereumNetwork } from '$eth/derived/network.derived';
import { ethereumTokens } from '$eth/derived/tokens.derived';
import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import type { Token, TokenId } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

/**
 * Ethereum (Ethereum or Sepolia) token - i.e. not ERC20.
 */
export const ethereumToken: Readable<Required<Token>> = derived(
	[ethereumTokens, selectedEthereumNetwork],
	([$ethTokens, { id }]) =>
		$ethTokens.find(({ network: { id: networkId } }) => id === networkId) ?? DEFAULT_ETHEREUM_TOKEN
);

export const ethereumTokenId: Readable<TokenId> = derived([ethereumToken], ([{ id }]) => id);
