import { erc20Tokens } from '$eth/derived/erc20.derived';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import type { Erc20Token } from '$eth/types/erc20';
import { ETHEREUM_TOKEN_ID } from '$icp-eth/constants/tokens.constants';
import { address as addressStore } from '$lib/derived/address.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const reloadBalance = async (token: Token): Promise<{ success: boolean }> => {
	if (token.id === ETHEREUM_TOKEN_ID) {
		return loadBalance({ networkId: token.network.id });
	}

	return loadErc20Balance(token as Erc20Token);
};

export const loadBalance = async ({
	networkId
}: {
	networkId: NetworkId;
}): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'ETH address is unknown.' }
		});

		return { success: false };
	}

	try {
		const { balance } = infuraProviders(networkId);
		const data = await balance(address);

		balancesStore.set({ tokenId: ETHEREUM_TOKEN_ID, data: { data, certified: false } });
	} catch (err: unknown) {
		balancesStore.reset(ETHEREUM_TOKEN_ID);

		toastsError({
			msg: { text: 'Error while loading the ETH balance.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};

export const loadErc20Balance = async (contract: Erc20Token): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'ETH address is unknown.' }
		});

		return { success: false };
	}

	try {
		const { balance } = infuraErc20Providers(contract.network.id);
		const data = await balance({ address, contract });
		balancesStore.set({ tokenId: contract.id, data: { data, certified: false } });
	} catch (err: unknown) {
		balancesStore.reset(contract.id);

		toastsError({
			msg: { text: `Error while loading ${contract.symbol} balance.` },
			err
		});

		return { success: false };
	}

	return { success: true };
};

export const loadBalances = async ({
	networkId
}: {
	networkId: NetworkId;
}): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'ETH address is unknown.' }
		});

		return { success: false };
	}

	const contracts = get(erc20Tokens);

	const results = await Promise.all([
		loadBalance({ networkId }),
		...contracts.map((contract) => loadErc20Balance(contract))
	]);

	return { success: results.every(({ success }) => success === true) };
};
