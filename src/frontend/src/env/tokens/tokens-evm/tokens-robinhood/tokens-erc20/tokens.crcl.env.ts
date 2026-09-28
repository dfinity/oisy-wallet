import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const CRCL_DECIMALS = 18;

export const CRCL_SYMBOL = 'CRCL';

export const CRCL_TOKEN_ID: TokenId = parseTokenId(CRCL_SYMBOL);

export const CRCL_TOKEN: RequiredEvmErc20Token = {
	id: CRCL_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Circle Internet Group • Robinhood Token',
	symbol: CRCL_SYMBOL,
	decimals: CRCL_DECIMALS,
	icon: robinhoodstock,
	address: '0xdF0992E440dD0be65BD8439b609d6D4366bf1CB5'
};
