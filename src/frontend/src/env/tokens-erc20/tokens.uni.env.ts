import { ETHEREUM_NETWORK } from '$env/networks.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import uni from '$icp-eth/assets/uni.svg';

export const UNI_DECIMALS = 18;

export const UNI_SYMBOL = 'UNI';

export const UNI_TOKEN_ID: unique symbol = Symbol(UNI_SYMBOL);

export const UNI_TOKEN: RequiredErc20Token = {
	id: UNI_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Uniswap',
	symbol: 'UNI',
	decimals: UNI_DECIMALS,
	icon: uni,
	address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
	exchange: 'erc20',
	twinTokenSymbol: 'ckUNI'
};
