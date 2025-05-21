import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import oneInch from '$eth/assets/1inch.svg';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const ONEINCH_DECIMALS = 18;

const ONEINCH_SYMBOL = '1INCH';

export const ONEINCH_TOKEN_ID: TokenId = parseTokenId(ONEINCH_SYMBOL);

export const ONEINCH_TOKEN: RequiredAdditionalErc20Token = {
	id: ONEINCH_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: '1INCH Token',
	symbol: ONEINCH_SYMBOL,
	decimals: ONEINCH_DECIMALS,
	icon: oneInch,
	address: '0x111111111117dc0aa78b770fa6a738034120c302',
	exchange: 'erc20'
};
