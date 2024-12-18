import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID,
	SOLANA_TESTNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import {
	solAddressDevnet,
	solAddressLocal,
	solAddressMainnet,
	solAddressTestnet
} from '$lib/derived/address.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionSolAddress, SolAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import { isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { address as solAddress } from '@solana/addresses';
import { type Lamports } from '@solana/rpc-types';
import { get, type Readable } from 'svelte/store';

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

const solanaAddressMapper: Record<NetworkId, Readable<OptionSolAddress>> = {
	[SOLANA_MAINNET_NETWORK_ID]: solAddressMainnet,
	[SOLANA_TESTNET_NETWORK_ID]: solAddressTestnet,
	[SOLANA_DEVNET_NETWORK_ID]: solAddressDevnet,
	[SOLANA_LOCAL_NETWORK_ID]: solAddressLocal
};

export const loadSolBalance = async ({
	networkId,
	tokenId
}: {
	networkId: NetworkId;
	tokenId: TokenId;
}): Promise<ResultSuccess> => {
	const addressOption = solanaAddressMapper[networkId];

	const {
		init: {
			error: { sol_address_unknown, loading_balance }
		}
	} = get(i18n);

	if (isNullish(addressOption) || isNullish(get(addressOption))) {
		toastsError({
			msg: { text: sol_address_unknown }
		});

		return { success: false };
	}

	// we arleady asserted that the address is not nullish
	const address = get(addressOption)!;

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
