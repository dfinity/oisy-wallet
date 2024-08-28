import type { TokenIndexKey } from '$lib/types/token';
import { writable } from 'svelte/store';

export interface TokensUiData {
	tokensKeys: TokenIndexKey[];
}

export const tokensUiStore = writable<TokensUiData>({ tokensKeys: [] });
