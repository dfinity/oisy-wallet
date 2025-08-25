import oneInch from '$eth/assets/1inch.svg';
import dai from '$eth/assets/dai.svg';
import icpDark from '$eth/assets/icp_dark.svg';
import uniswap from '$eth/assets/uniswap.svg';
import usdt from '$eth/assets/usdt.svg';
import type { Erc20Contract, Erc20Metadata, Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken, EthereumUserToken } from '$eth/types/erc20-user-token';
import type { EthereumNetwork } from '$eth/types/network';
import type { Token } from '$lib/types/token';
import type { UserTokenState } from '$lib/types/token-toggleable';

type MapErc20TokenParams = Erc20Contract &
	Erc20Metadata & { network: EthereumNetwork } & Pick<Token, 'category'> &
	Partial<Pick<Token, 'id'>>;

export const mapErc20Token = ({ id, symbol, name, ...rest }: MapErc20TokenParams): Erc20Token => ({
	id: id ?? Symbol(symbol),
	standard: 'erc20',
	name,
	symbol,
	icon: mapErc20Icon(symbol),
	...rest
});

export const mapErc20UserToken = ({
	id,
	symbol,
	name,
	network,
	...rest
}: MapErc20TokenParams & UserTokenState): Erc20UserToken => ({
	id: id ?? Symbol(`user-token#${symbol}#${network.chainId}`),
	standard: 'erc20',
	name,
	symbol,
	icon: mapErc20Icon(symbol),
	network,
	...rest
});

const mapErc20Icon = (symbol: string): string | undefined => {
	switch (symbol.toLowerCase()) {
		case 'uni':
			return uniswap;
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

export const icTokenEthereumUserToken = (token: Token): token is EthereumUserToken =>
	(token.standard === 'ethereum' || token.standard === 'erc20') && 'enabled' in token;

export const icTokenErc20UserToken = (token: Token): token is Erc20UserToken =>
	token.standard === 'erc20' && 'enabled' in token && 'address' in token && 'exchange' in token;
