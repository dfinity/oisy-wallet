import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import { token } from '$lib/stores/token.store';
import type { OptionTokenId, OptionTokenStandard, Token, TokenCategory } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * A derived store which can be used for code convenience reasons.
 */
export const tokenWithFallback: Readable<Token> = derived(
	[token],
	([$token]) => $token ?? DEFAULT_ETHEREUM_TOKEN
);

export const tokenId: Readable<OptionTokenId> = derived([token], ([$token]) => $token?.id);

export const tokenStandard: Readable<OptionTokenStandard> = derived(
	[token],
	([$token]) => $token?.standard
);

export const tokenSymbol: Readable<string | undefined> = derived(
	[token],
	([$token]) => $token?.symbol
);

export const tokenDecimals: Readable<number | undefined> = derived(
	[token],
	([$token]) => $token?.decimals
);

export const tokenCategory: Readable<TokenCategory | undefined> = derived(
	[token],
	([$token]) => $token?.category
);

export const tokenToggleable: Readable<boolean> = derived(
	[token],
	([$token]) => nonNullish($token) && 'enabled' in $token
);
