import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import tslax from '$sol/assets/tslax.svg';

export const TSLA_DECIMALS = 18;

export const TSLA_SYMBOL = 'TSLA';

export const TSLA_TOKEN_ID: TokenId = parseTokenId(TSLA_SYMBOL);

export const TSLA_TOKEN: RequiredEvmErc20Token = {
	id: TSLA_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Tesla • Robinhood Token',
	symbol: TSLA_SYMBOL,
	decimals: TSLA_DECIMALS,
	icon: tslax,
	address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d'
};
