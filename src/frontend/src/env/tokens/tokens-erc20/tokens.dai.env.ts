import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import dai from '$eth/assets/dai.svg';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const DAI_DECIMALS = 18;

const DAI_SYMBOL = 'DAI';

export const DAI_TOKEN_ID: TokenId = parseTokenId(DAI_SYMBOL);

export const DAI_TOKEN: RequiredAdditionalErc20Token = {
	id: DAI_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Dai Stablecoin',
	symbol: DAI_SYMBOL,
	decimals: DAI_DECIMALS,
	icon: dai,
	address: '0x6b175474e89094c44da98b954eedeac495271d0f',
	exchange: 'erc20'
};
