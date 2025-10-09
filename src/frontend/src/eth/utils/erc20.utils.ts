import type { Erc20Contract, Erc20Metadata, Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken, EthereumUserToken } from '$eth/types/erc20-user-token';
import type { EthereumNetwork } from '$eth/types/network';
import icpDark from '$icp/assets/icp-dark.svg';
import type { Token } from '$lib/types/token';
import type { UserTokenState } from '$lib/types/token-toggleable';
import { parseTokenId } from '$lib/validation/token.validation';

type MapErc20TokenParams = Erc20Contract &
	Erc20Metadata & { network: EthereumNetwork } & Pick<Token, 'category'> &
	Partial<Pick<Token, 'id'>>;

export const mapErc20Token = ({ id, symbol, name, ...rest }: MapErc20TokenParams): Erc20Token => ({
	id: id ?? parseTokenId(symbol),
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
	id: id ?? parseTokenId(`user-token#${symbol}#${network.chainId}`),
	standard: 'erc20',
	name,
	symbol,
	icon: mapErc20Icon(symbol),
	network,
	...rest
});

export const mapErc20Icon = (symbol: string): string | undefined => {
	switch (symbol.toLowerCase()) {
		// ICP in production. ckICP was used on staging because the definitive name and symbol had not been decided.
		case 'icp':
		case 'ckicp':
			return icpDark;
		default:
			return undefined;
	}
};

export const isTokenErc20 = (token: Token): token is Erc20Token => token.standard === 'erc20';

export const isTokenEthereumUserToken = (token: Token): token is EthereumUserToken =>
	(token.standard === 'ethereum' || isTokenErc20(token)) && 'enabled' in token;

export const isTokenErc20UserToken = (token: Token): token is Erc20UserToken =>
	isTokenErc20(token) && 'enabled' in token && 'address' in token && 'exchange' in token;
