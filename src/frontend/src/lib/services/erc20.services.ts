import dai from '$lib/assets/dai.svg';
import uniswap from '$lib/assets/uniswap.svg';
import usdc from '$lib/assets/usdc.svg';
import usdt from '$lib/assets/usdt.svg';
import { ERC20_CONTRACTS_ADDRESSES } from '$lib/constants/erc20.constants';
import { metadata } from '$lib/providers/etherscan-erc20.providers';
import { balancesStore } from '$lib/stores/balances.store';
import { erc20TokensStore } from '$lib/stores/erc20.store';
import { toastsError } from '$lib/stores/toasts.store';

const mapErc20Icon = (tokenName: string): string | undefined => {
	switch (tokenName.toLowerCase()) {
		case 'uniswap':
			return uniswap;
		case 'usd coin':
			return usdc;
		case 'tether usd':
			return usdt;
		case 'dai stablecoin':
			return dai;
		default:
			return undefined;
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
				icon: mapErc20Icon(name),
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
