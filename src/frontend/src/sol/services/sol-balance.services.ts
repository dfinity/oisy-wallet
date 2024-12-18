import { solAddress } from '$lib/derived/address.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionSolAddress, SolAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import { isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { address as solanaAddress } from '@solana/addresses';
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

	const wallet = solanaAddress(address);
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
	const address: OptionSolAddress = get(solAddress);

	const {
		init: {
			error: { sol_address_unknown, loading_balance }
		}
	} = get(i18n);

	if (isNullish(address)) {
		toastsError({
			msg: { text: sol_address_unknown }
		});

		return { success: false };
	}

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
