import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import avgox from '$sol/assets/avgox.svg';

export const AVGO_DECIMALS = 18;

export const AVGO_SYMBOL = 'AVGO';

export const AVGO_TOKEN_ID: TokenId = parseTokenId(AVGO_SYMBOL);

export const AVGO_TOKEN: RequiredEvmErc20Token = {
	id: AVGO_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Broadcom • Robinhood Token',
	symbol: AVGO_SYMBOL,
	decimals: AVGO_DECIMALS,
	icon: avgox,
	address: '0x156E175DD063a8cE274C50654eF40e0032b3fbcF'
};
