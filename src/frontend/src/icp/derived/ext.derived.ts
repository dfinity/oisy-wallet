import { extCustomTokensStore } from '$icp/stores/ext-custom-tokens.store';
import type { ExtCustomToken } from '$icp/types/ext-custom-token';
import { derived, type Readable } from 'svelte/store';

/**
 * The list of EXT custom tokens the user has added, enabled or disabled.
 */
export const extCustomTokens: Readable<ExtCustomToken[]> = derived(
	[extCustomTokensStore],
	([$extCustomTokensStore]) => $extCustomTokensStore?.map(({ data: token }) => token) ?? []
);

/**
 * The list of all EXT tokens.
 */
export const extTokens: Readable<ExtCustomToken[]> = derived(
	[extCustomTokens],
	([$extCustomTokens]) => [...$extCustomTokens]
);

/**
 * The list of all enabled EXT tokens.
 */
export const enabledExtTokens: Readable<ExtCustomToken[]> = derived([extTokens], ([$extTokens]) =>
	$extTokens.filter(({ enabled }) => enabled)
);

export const extCustomTokensInitialized: Readable<boolean> = derived(
	[extCustomTokensStore],
	([$extCustomTokensStore]) => $extCustomTokensStore !== undefined
);

export const extCustomTokensNotInitialized: Readable<boolean> = derived(
	[extCustomTokensInitialized],
	([$extCustomTokensInitialized]) => !$extCustomTokensInitialized
);
