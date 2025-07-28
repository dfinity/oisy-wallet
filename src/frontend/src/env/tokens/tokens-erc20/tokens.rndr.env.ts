import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import rndr from '$eth/assets/rndr.svg';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const RNDR_DECIMALS = 18;

const RNDR_SYMBOL = 'RNDR';

export const RNDR_TOKEN_ID: TokenId = parseTokenId(RNDR_SYMBOL);

export const RNDR_TOKEN: RequiredAdditionalErc20Token = {
	id: RNDR_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Render Token',
	symbol: RNDR_SYMBOL,
	decimals: RNDR_DECIMALS,
	icon: rndr,
	address: '0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24',
	exchange: 'erc20'
};
