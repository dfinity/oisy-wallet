import { consoleWarn } from '$lib/utils/console.utils';
import { getSplTokenMetadata } from '$sol/api/solana.api';
import { splTokenMetadataStore, type SplTokenMetadata } from '$sol/stores/spl-token-metadata.store';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
import { get } from 'svelte/store';

/**
 * Names the mints the wallet does not list, from the metadata a Token-2022 mint keeps in its own
 * account.
 *
 * Best effort by design: a legacy SPL mint carries nothing, and a failed read leaves the token
 * unnamed rather than failing the transaction it appeared in. Mints already known are not asked
 * about again.
 */
export const loadSplTokenMetadata = async ({
	tokenAddresses,
	network
}: {
	tokenAddresses: SplTokenAddress[];
	network: SolanaNetworkType;
}): Promise<void> => {
	const known = get(splTokenMetadataStore)[network] ?? {};

	const missing = [...new Set(tokenAddresses)].filter((address) => !(address in known));

	if (missing.length === 0) {
		return;
	}

	try {
		const metadata = await getSplTokenMetadata({ addresses: missing, network });

		// Mints that answered with nothing are recorded as such, so a legacy mint is not asked
		// about once per transaction it appears in.
		splTokenMetadataStore.set({
			network,
			metadata: missing.reduce<Partial<Record<SplTokenAddress, SplTokenMetadata>>>(
				(acc, address) => {
					acc[address] = metadata[address] ?? { name: '', symbol: '' };

					return acc;
				},
				{}
			)
		});
	} catch (err: unknown) {
		consoleWarn('Could not read Solana token metadata', err);
	}
};
