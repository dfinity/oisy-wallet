import { solanaNetworkAddressLookup } from '$lib/derived/address.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { SolAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import { isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { address as solAddress } from '@solana/addresses';
import { type Lamports } from '@solana/rpc-types';
import { get } from 'svelte/store';

const loadLamportsBalance = async ({
	address,
	networkId
}: {
	address: SolAddress;
	networkId: NetworkId;
}): Promise<Lamports> => {
	const { getBalance } = solanaHttpRpc(networkId);

	const wallet = solAddress(address);
	const { value: balance } = await getBalance(wallet).send();

	return balance;
};

export const loadSolBalance = async ({
	networkId,
	tokenId
}: {
	networkId: NetworkId;
	tokenId: TokenId;
}): Promise<ResultSuccess> => {
	const maybeSolanaNetworkAddress = solanaNetworkAddressLookup[networkId];

	const {
		init: {
			error: { sol_address_unknown, loading_balance }
		}
	} = get(i18n);

	if (isNullish(maybeSolanaNetworkAddress) || isNullish(get(maybeSolanaNetworkAddress))) {
		toastsError({
			msg: { text: sol_address_unknown }
		});

		return { success: false };
	}

	// we arleady asserted that the address is not nullish
	const address = get(maybeSolanaNetworkAddress)!;

	try {
		const balance = await loadLamportsBalance({ address, networkId });

		balancesStore.set({ tokenId, data: { data: BigNumber.from(balance), certified: false } });
	} catch (err: unknown) {
		balancesStore.reset(tokenId);

		toastsError({
			msg: { text: loading_balance },
			err
		});

		return { success: false };
	}

	return { success: true };
};
