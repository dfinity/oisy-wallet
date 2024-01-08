import { erc20Tokens } from '$eth/derived/erc20.derived';
import { icrcTokens } from '$icp/derived/icrc.derived';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$lib/constants/tokens.constants';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const tokens: Readable<Token[]> = derived(
	[erc20Tokens, icrcTokens],
	([$erc20Tokens, $icrcTokens]) => [ICP_TOKEN, ...$icrcTokens, ETHEREUM_TOKEN, ...$erc20Tokens]
);
