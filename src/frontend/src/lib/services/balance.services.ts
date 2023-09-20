import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { erc20Tokens } from '$lib/derived/erc20.derived';
import { balance as balanceErc20Service } from '$lib/providers/infura-erc20.providers';
import { balance as balanceService } from '$lib/providers/infura.providers';
import { addressStore } from '$lib/stores/address.store';
import { balancesStore } from '$lib/stores/balances.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Erc20Token } from '$lib/types/erc20';
import type { Token } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const reloadBalance = async (token: Token): Promise<{ success: boolean }> => {
	if (token.id === ETHEREUM_TOKEN_ID) {
		return loadBalance();
	}

	return loadErc20Balance(token as Erc20Token);
};

export const loadBalance = async (): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'ETH address is unknown.' }
		});

		return { success: false };
	}

	try {
		const balance = await balanceService(address);
		balancesStore.set({ tokenId: ETHEREUM_TOKEN_ID, balance });
	} catch (err: unknown) {
		balancesStore.reset();

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
		const balance = await balanceErc20Service({ address, contract });
		balancesStore.set({ tokenId: contract.id, balance });
	} catch (err: unknown) {
		balancesStore.reset();

		toastsError({
			msg: { text: `Error while loading ${contract.symbol} balance.` },
			err
		});

		return { success: false };
	}

	return { success: true };
};

export const loadBalances = async (): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'ETH address is unknown.' }
		});

		return { success: false };
	}

	const contracts = get(erc20Tokens);

	const results = await Promise.all([
		loadBalance(),
		...contracts.map((contract) => loadErc20Balance(contract))
	]);

	return { success: results.every(({ success }) => success === true) };
};
