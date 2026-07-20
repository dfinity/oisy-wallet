import type { Erc20Contract, Erc20Metadata, Erc20Token } from '$eth/types/erc20';
import type { Erc20CustomToken, EthereumCustomToken } from '$eth/types/erc20-custom-token';
import type { EthereumNetwork } from '$eth/types/network';
import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
import { DEFAULT_TOKEN_TAGS } from '$lib/constants/token-tag.constants';
import type { Token } from '$lib/types/token';
import { toggleableTokenGuard, tokenStandardGuard } from '$lib/utils/token-guards.utils';
import { parseTokenId } from '$lib/validation/token.validation';

type MapErc20TokenParams = Erc20Contract &
	Erc20Metadata & { network: EthereumNetwork } & Pick<Token, 'category'> &
	Partial<Pick<Token, 'id'>>;

export const mapErc20Token = ({ id, symbol, name, ...rest }: MapErc20TokenParams): Erc20Token => ({
	id: id ?? parseTokenId(symbol),
	standard: { code: 'erc20' },
	name,
	symbol,
	icon: undefined,
	tags: DEFAULT_TOKEN_TAGS,
	...rest
});

export const isTokenErc20 = tokenStandardGuard<Erc20Token>('erc20');

export const isTokenErc20CustomToken = toggleableTokenGuard<Erc20CustomToken>(isTokenErc20);

export const isTokenEthereumCustomToken = toggleableTokenGuard<EthereumCustomToken>(
	(token: Token) => isTokenEthereumNative(token) || isTokenErc20(token)
);
