import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { enabledEvmTokens } from '$evm/derived/tokens.derived';
import type { RequiredToken } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const enabledEthEvmNativeTokens: Readable<RequiredToken[]> = derived(
	[enabledEthereumTokens, enabledEvmTokens],
	([$enabledEthereumTokens, $enabledEvmTokens]) => [...$enabledEthereumTokens, ...$enabledEvmTokens]
);
