import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import jasmy from '$eth/assets/jasmy.svg';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const JASMY_DECIMALS = 18;

const JASMY_SYMBOL = 'JASMY';

export const JASMY_TOKEN_ID: TokenId = parseTokenId(JASMY_SYMBOL);

export const JASMY_TOKEN: RequiredAdditionalErc20Token = {
	id: JASMY_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'JasmyCoin',
	symbol: JASMY_SYMBOL,
	decimals: JASMY_DECIMALS,
	icon: jasmy,
	address: '0x7420B4b9a0110cdC71fB720908340C03F9Bc03EC',
	exchange: 'erc20'
};
