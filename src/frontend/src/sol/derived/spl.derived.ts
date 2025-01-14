import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { enabledSolanaNetworksIds } from '$sol/derived/networks.derived';
import type { SplToken } from '$sol/types/spl';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
import { derived, type Readable } from 'svelte/store';

const splDefaultTokens: Readable<SplToken[]> = derived(
	[enabledSolanaNetworksIds],
	([$enabledSolanaNetworksIds]) =>
		SPL_TOKENS.filter(({ network: { id: networkId } }) =>
			$enabledSolanaNetworksIds.includes(networkId)
		)
);

const splDefaultTokensToggleable: Readable<SplTokenToggleable[]> = derived(
	[splDefaultTokens],
	([$splDefaultTokens]) => $splDefaultTokens.map((token) => ({ ...token, enabled: true }))
);

/**
 * The list of all SPL tokens.
 */
export const splTokens: Readable<SplTokenToggleable[]> = derived(
	[splDefaultTokensToggleable],
	([$splDefaultTokensToggleable]) => [...$splDefaultTokensToggleable]
);
