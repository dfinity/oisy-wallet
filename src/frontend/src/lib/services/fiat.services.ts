import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { Erc20PriceByContract, EthPrice } from '$lib/providers/coingecko.providers';
import { balancesStore } from '$lib/stores/balances.store';
import { fiatStore } from '$lib/stores/fiat.store';
import { toastsError } from '$lib/stores/toasts.store';
import { get } from 'svelte/store';

export const loadFiatBalance = async (): Promise<{ success: boolean }> => {
	const balances = get(balancesStore);

	// https://github.com/microsoft/TypeScript/issues/1863
	// @ts-ignore
	const { [ETHEREUM_TOKEN_ID]: ethBalance, ...erc20Tokens } = balances;

	try {
		const ethPrice = await EthPrice();
		fiatStore.set({ tokenId: ETHEREUM_TOKEN_ID, fiatBalance: ethPrice! });
	} catch (err: unknown) {
		fiatStore.reset();
		toastsError({
			msg: { text: 'Error while fetching Ethereum price.' },
			err
		});
	}

	try {
		const erc20Prices = await Erc20PriceByContract(Object.getOwnPropertySymbols(erc20Tokens));
		Object.getOwnPropertySymbols(erc20Prices).map((k) =>
			fiatStore.set({ tokenId: k, fiatBalance: erc20Prices[k] })
		);
	} catch (err: unknown) {
		fiatStore.reset();
		toastsError({
			msg: { text: 'Error while fetching ERC20 prices.' },
			err
		});
	}

	console.log('>>>', get(fiatStore));
	return { success: true };
};
