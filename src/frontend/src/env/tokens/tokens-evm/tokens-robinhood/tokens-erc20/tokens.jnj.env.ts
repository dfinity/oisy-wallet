import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const JNJ_DECIMALS = 18;

export const JNJ_SYMBOL = 'JNJ';

export const JNJ_TOKEN_ID: TokenId = parseTokenId(JNJ_SYMBOL);

export const JNJ_TOKEN: RequiredEvmErc20Token = {
	id: JNJ_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Johnson & Johnson • Robinhood Token',
	symbol: JNJ_SYMBOL,
	decimals: JNJ_DECIMALS,
	icon: robinhoodstock,
	address: '0x03DfbBE0AC4E7bCDaFd08eD41A400326B77D8c80'
};
