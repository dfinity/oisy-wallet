import { enabledErc20Tokens, erc20Tokens } from '$eth/derived/erc20.derived';
import { enabledErc4626Tokens, erc4626Tokens } from '$eth/derived/erc4626.derived';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { derived, type Readable } from 'svelte/store';

export const ercFungibleTokens: Readable<(Erc20CustomToken | Erc4626CustomToken)[]> = derived(
	[erc20Tokens, erc4626Tokens],
	([$erc20Tokens, $erc4626Tokens]) => [...$erc20Tokens, ...$erc4626Tokens]
);

export const enabledErcFungibleTokens: Readable<(Erc20CustomToken | Erc4626CustomToken)[]> =
	derived(
		[enabledErc20Tokens, enabledErc4626Tokens],
		([$enabledErc20Tokens, $enabledErc4626Tokens]) => [
			...$enabledErc20Tokens,
			...$enabledErc4626Tokens
		]
	);
