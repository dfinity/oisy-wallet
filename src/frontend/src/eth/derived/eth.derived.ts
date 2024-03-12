import { selectedEthereumNetwork } from '$eth/derived/network.derived';
import { ETHEREUM_TOKENS } from '$icp-eth/constants/tokens.constants';
import type { Token, TokenId } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const ethToken: Readable<Required<Token>> = derived(
	[selectedEthereumNetwork],
	([{ id }]) =>
		ETHEREUM_TOKENS.find(({ network: { id: networkId } }) => id === networkId) ?? ETHEREUM_TOKENS[0]
);

export const ethTokenId: Readable<TokenId> = derived([ethToken], ([{ id }]) => id);
