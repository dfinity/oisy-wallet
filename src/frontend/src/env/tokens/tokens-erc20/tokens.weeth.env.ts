import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import weeth from '$eth/assets/weeth.svg';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const WEETH_DECIMALS = 18;

const WEETH_SYMBOL = 'weETH';

export const WEETH_TOKEN_ID: TokenId = parseTokenId(WEETH_SYMBOL);

export const WEETH_TOKEN: RequiredAdditionalErc20Token = {
	id: WEETH_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Wrapped eETH',
	symbol: WEETH_SYMBOL,
	decimals: WEETH_DECIMALS,
	icon: weeth,
	address: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
	exchange: 'erc20'
};
