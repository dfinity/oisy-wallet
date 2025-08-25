import oneInch from '$lib/assets/1inch.svg';
import dai from '$lib/assets/dai.svg';
import icpDark from '$lib/assets/icp_dark.svg';
import uniswap from '$lib/assets/uniswap.svg';
import usdc from '$lib/assets/usdc.svg';
import usdt from '$lib/assets/usdt.svg';
import { ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import type { Erc20Contract, Erc20Metadata, Erc20Token } from '$lib/types/erc20';

export const mapErc20Token = ({
	symbol,
	name,
	...rest
}: Erc20Contract & Erc20Metadata): Erc20Token => ({
	id: Symbol(symbol),
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	name,
	symbol,
	icon: mapErc20Icon(symbol),
	...rest
});

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
		case '1inch':
			return oneInch;
		// ICP in production. ckICP was used on staging because the definitive name and symbol had not been decided.
		case 'icp':
		case 'ckicp':
			return icpDark;
		default:
			return undefined;
	}
};
