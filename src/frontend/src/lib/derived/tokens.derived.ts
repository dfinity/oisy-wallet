import { erc20Tokens } from '$eth/derived/erc20.derived';
import { icrcTokens } from '$icp/derived/icrc.derived';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$lib/constants/tokens.constants';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const sortedIcrcTokens: Readable<Token[]> = derived([icrcTokens], ([$icrcTokens]) =>
	$icrcTokens.sort(({ name: nameA }, { name: nameB }) => nameA.localeCompare(nameB))
);

export const tokens: Readable<Token[]> = derived(
	[erc20Tokens, sortedIcrcTokens],
	([$erc20Tokens, $icrcTokens]) => [ICP_TOKEN, ...$icrcTokens, ETHEREUM_TOKEN, ...$erc20Tokens]
);
