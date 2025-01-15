import { enabledSolanaNetworksIds } from '$sol/derived/networks.derived';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { SplToken, SplTokenAddress } from '$sol/types/spl';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
import { derived, type Readable } from 'svelte/store';

const splDefaultTokens: Readable<SplTokenToggleable[]> = derived(
	[splDefaultTokensStore, enabledSolanaNetworksIds],
	([$splTokensStore, $enabledSolanaNetworksIds]) =>
		($splTokensStore ?? []).filter(({ network: { id: networkId } }) =>
			$enabledSolanaNetworksIds.includes(networkId)
		)
);

const splDefaultTokensToggleable: Readable<SplTokenToggleable[]> = derived(
	[splDefaultTokens],
	([$splDefaultTokens]) => $splDefaultTokens.map((token) => token)
);

const enabledSplDefaultTokens: Readable<SplTokenToggleable[]> = derived(
	[splDefaultTokensToggleable],
	([$splDefaultTokensToggleable]) => $splDefaultTokensToggleable.filter(({ enabled }) => enabled)
);

/**
 * The list of all SPL tokens.
 */
export const splTokens: Readable<SplTokenToggleable[]> = derived(
	[splDefaultTokensToggleable],
	([$splDefaultTokensToggleable]) => [...$splDefaultTokensToggleable]
);

export const enabledSplTokens: Readable<SplToken[]> = derived(
	[enabledSplDefaultTokens],
	([$splTokens]) => [...$splTokens]
);

export const enabledSplTokenAddresses: Readable<SplTokenAddress[]> = derived(
	[enabledSplTokens],
	([$enabledSplTokens]) => $enabledSplTokens.map(({ address }) => address)
);
