import { enabledArbitrumTokens } from '$evm/arbitrum/derived/tokens.derived';
import { enabledBaseTokens } from '$evm/base/derived/tokens.derived';
import { enabledBscTokens } from '$evm/bsc/derived/tokens.derived';
import { enabledPolygonTokens } from '$evm/polygon/derived/tokens.derived';
import type { RequiredToken } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const enabledEvmTokens: Readable<RequiredToken[]> = derived(
	[enabledBaseTokens, enabledBscTokens, enabledPolygonTokens, enabledArbitrumTokens],
	([$enabledBaseTokens, $enabledBscTokens, $enabledPolygonTokens, $enabledArbitrumTokens]) => [
		...$enabledBaseTokens,
		...$enabledBscTokens,
		...$enabledPolygonTokens,
		...$enabledArbitrumTokens
	]
);
