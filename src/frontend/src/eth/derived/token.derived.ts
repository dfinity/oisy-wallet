import { selectedEthereumNetwork } from '$eth/derived/network.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import type { RequiredTokenWithLinkedData, TokenId } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

/**
 * Native token - i.e. not ERC20 - for the selected Ethereum/EVM network.
 */
export const nativeEthereumToken: Readable<RequiredTokenWithLinkedData> = derived(
	[enabledEthereumTokens, selectedEthereumNetwork],
	([$enabledEthereumTokens, $selectedEthereumNetwork]) =>
		$enabledEthereumTokens.find(
			({ network: { id: networkId } }) => $selectedEthereumNetwork?.id === networkId
		) ?? DEFAULT_ETHEREUM_TOKEN
);

export const nativeEthereumTokenId: Readable<TokenId> = derived(
	[nativeEthereumToken],
	([{ id }]) => id
);
