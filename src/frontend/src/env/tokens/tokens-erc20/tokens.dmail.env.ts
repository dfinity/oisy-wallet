import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import dmail from '$eth/assets/dmail.svg';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const DMAIL_DECIMALS = 18;

const DMAIL_SYMBOL = 'DMAIL';

export const DMAIL_TOKEN_ID: TokenId = parseTokenId(DMAIL_SYMBOL);

export const DMAIL_TOKEN: RequiredAdditionalErc20Token = {
	id: DMAIL_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Dmail Network',
	symbol: DMAIL_SYMBOL,
	decimals: DMAIL_DECIMALS,
	icon: dmail,
	address: '0xcC6f1e1B87cfCbe9221808d2d85C501aab0B5192',
	exchange: 'erc20'
};
