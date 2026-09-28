import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import nvdax from '$sol/assets/nvdax.svg';

export const NVDA_DECIMALS = 18;

export const NVDA_SYMBOL = 'NVDA';

export const NVDA_TOKEN_ID: TokenId = parseTokenId(NVDA_SYMBOL);

export const NVDA_TOKEN: RequiredEvmErc20Token = {
	id: NVDA_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'NVIDIA • Robinhood Token',
	symbol: NVDA_SYMBOL,
	decimals: NVDA_DECIMALS,
	icon: nvdax,
	address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC'
};
