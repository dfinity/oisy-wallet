import { ETHEREUM_TOKEN, ICP_TOKEN } from '$lib/constants/tokens.constants';
import { erc20Tokens } from '$lib/derived/erc20.derived';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const tokens: Readable<Token[]> = derived([erc20Tokens], ([$erc20Tokens]) => [
	ICP_TOKEN,
	ETHEREUM_TOKEN,
	...$erc20Tokens
]);
