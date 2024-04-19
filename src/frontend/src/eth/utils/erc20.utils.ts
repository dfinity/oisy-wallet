import oneInch from '$eth/assets/1inch.svg';
import dai from '$eth/assets/dai.svg';
import icpDark from '$eth/assets/icp_dark.svg';
import uniswap from '$eth/assets/uniswap.svg';
import usdc from '$eth/assets/usdc.svg';
import usdt from '$eth/assets/usdt.svg';
import type { Erc20Contract, Erc20Metadata, Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import type { Token } from '$lib/types/token';

export const mapErc20Token = ({
	id,
	symbol,
	name,
	...rest
}: Erc20Contract &
	Erc20Metadata & { network: EthereumNetwork } & Pick<Token, 'category'> &
	Partial<Pick<Token, 'id'>>): Erc20Token => ({
	id: id ?? Symbol(symbol),
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
