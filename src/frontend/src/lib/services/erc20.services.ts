import oisy from '$lib/assets/oisy.svg';
import uniswap from '$lib/assets/uniswap.svg';
import { ERC20_CONTRACTS_ADDRESSES } from '$lib/constants/erc20.constants';
import { metadata } from '$lib/providers/etherscan-erc20.providers';
import { balancesStore } from '$lib/stores/balances.store';
import { erc20TokensStore } from '$lib/stores/erc20.store';
import { toastsError } from '$lib/stores/toasts.store';

const mapIcon = (tokenName: string): string => {
	switch (tokenName.toLowerCase()) {
		case 'uniswap':
			return uniswap;
		default:
			return oisy;
	}
};

export const loadErc20Contracts = async (): Promise<{ success: boolean }> => {
	try {
		const contracts = await Promise.all(
			ERC20_CONTRACTS_ADDRESSES.map(async (contract) => ({
				...contract,
				...(await metadata(contract))
			}))
		);
		erc20TokensStore.set(
			contracts.map(({ symbol, name, ...rest }) => ({
				id: Symbol(symbol),
				name,
				symbol,
				icon: mapIcon(name),
				...rest
			}))
		);
	} catch (err: unknown) {
		balancesStore.reset();

		toastsError({
			msg: { text: 'Error while loading the ERC20 contracts.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};
