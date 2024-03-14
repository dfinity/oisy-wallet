import { ICP_TOKEN } from '$env/tokens.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { ethereumTokens } from '$eth/derived/tokens.derived';
import { sortedIcrcTokens } from '$icp/derived/icrc.derived';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const tokens: Readable<Token[]> = derived(
	[erc20Tokens, sortedIcrcTokens, ethereumTokens],
	([$erc20Tokens, $icrcTokens, $ethereumTokens]) => [
		ICP_TOKEN,
		...$icrcTokens,
		...$ethereumTokens,
		...$erc20Tokens
	]
);
