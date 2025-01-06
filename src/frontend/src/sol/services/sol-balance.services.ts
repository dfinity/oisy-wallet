import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import type { SolAddress } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { loadSolLamportsBalance } from '$sol/api/solana.api';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { assertNonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

export const loadSolBalance = async ({
	address,
	token
}: {
	address: SolAddress;
	token: Token;
}): Promise<ResultSuccess> => {
	const {
		id: tokenId,
		network: { id: networkId }
	} = token;

	const solNetwork = mapNetworkIdToNetwork(networkId);

	assertNonNullish(
		solNetwork,
		replacePlaceholders(get(i18n).init.error.no_solana_network, {
			$network: networkId.description ?? ''
		})
	);

	try {
		const balance = await loadSolLamportsBalance({ address, network: solNetwork });

		balancesStore.set({ tokenId, data: { data: BigNumber.from(balance), certified: false } });

		return { success: true };
	} catch (err: unknown) {
		balancesStore.reset(tokenId);

		// We don't want to disrupt the user experience if we can't load the balance.
		console.error(`Error fetching ${tokenId.description} balance data:`, err);

		return { success: false };
	}
};
