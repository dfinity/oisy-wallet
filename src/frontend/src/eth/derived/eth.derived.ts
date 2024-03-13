import { selectedEthereumNetwork } from '$eth/derived/network.derived';
import { ETHEREUM_TOKENS } from '$icp-eth/constants/tokens.constants';
import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import type { Token, TokenId } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const ethToken: Readable<Required<Token>> = derived(
	[selectedEthereumNetwork],
	([{ id }]) =>
		ETHEREUM_TOKENS.find(({ network: { id: networkId } }) => id === networkId) ??
		DEFAULT_ETHEREUM_TOKEN
);

export const ethTokenId: Readable<TokenId> = derived([ethToken], ([{ id }]) => id);
