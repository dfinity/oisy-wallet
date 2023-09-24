import dai from '$lib/assets/dai.svg';
import icp from '$lib/assets/icp.svg';
import uniswap from '$lib/assets/uniswap.svg';
import usdc from '$lib/assets/usdc.svg';
import usdt from '$lib/assets/usdt.svg';
import { ERC20_CONTRACTS_ADDRESSES } from '$lib/constants/erc20.constants';
import { metadata } from '$lib/providers/infura-erc20.providers';
import { erc20TokensStore } from '$lib/stores/erc20.store';
import { toastsError } from '$lib/stores/toasts.store';

const mapErc20Icon = (symbol: string): string | undefined => {
	switch (symbol.toLowerCase()) {
		case 'uni':
			return uniswap;
		case 'usdc':
			return usdc;
		case 'usdt':
			return usdt;
		case 'dai':
			return dai;
		// ICP in production. ckICP was used on staging because the definitive name and symbol had not been decided.
		case 'icp':
		case 'ckicp':
			return icp;
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
				icon: mapErc20Icon(symbol),
				...rest
			}))
		);
	} catch (err: unknown) {
		erc20TokensStore.reset();

		toastsError({
			msg: { text: 'Error while loading the ERC20 contracts.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};
